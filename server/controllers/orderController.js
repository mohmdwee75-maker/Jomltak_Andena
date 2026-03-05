const Order    = require('../models/Order');
const Product  = require('../models/Product');
const Supplier = require('../models/Supplier');

// ── إنشاء طلب ──────────────────────────────────────────
const createOrder = async (req, res) => {
  try {
    const { items, deliveryInfo } = req.body;
    const customer_id = req.user?.userId;

    const { fullName, phone, address, city, governorate, requestedDate } = deliveryInfo || {};
    if (!fullName || !phone || !address || !city || !governorate || !requestedDate)
      return res.status(400).json({ message: 'من فضلك اكمل كل الحقول المطلوبة' });

    if (!items || items.length === 0)
      return res.status(400).json({ message: 'السلة فارغة' });

    let totalPrice = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findOne({ productId: Number(item.productId) });
      if (!product) continue;
      const subtotal = product.price * item.quantity;
      totalPrice += subtotal;
      orderItems.push({
        product_id: product._id,
        name:       product.name,
        price:      product.price,
        quantity:   item.quantity,
        subtotal,
        image:      product.media?.[0]?.url || '',
      });
    }

    if (orderItems.length === 0)
      return res.status(400).json({ message: 'لم يتم العثور على المنتجات' });

    const lastOrder = await Order.findOne().sort({ orderId: -1 });
    const orderId   = lastOrder ? lastOrder.orderId + 1 : 1;

    const order = await Order.create({
      orderId, items: orderItems, totalPrice,
      customer_id: customer_id || null,
      deliveryInfo: {
        fullName:      deliveryInfo.fullName,
        phone:         deliveryInfo.phone,
        address:       deliveryInfo.address,
        street:        deliveryInfo.street        || '',
        building:      deliveryInfo.building      || '',
        city:          deliveryInfo.city,
        district:      deliveryInfo.district      || '',
        governorate:   deliveryInfo.governorate,
        landmark:      deliveryInfo.landmark      || '',
        addressType:   deliveryInfo.addressType   || 'home',
        requestedDate: new Date(deliveryInfo.requestedDate),
        notes:         deliveryInfo.notes         || '',
      },
      status: 'pending'
    });

    res.status(201).json({ message: 'تم إرسال الطلب بنجاح', order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'حدث خطأ في إنشاء الطلب' });
  }
};

// ── إلغاء طلب من العميل ────────────────────────────────
const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason }  = req.body;
    const customer_id = req.user.userId;

    const order = await Order.findOne({ orderId: Number(orderId) });
    if (!order) return res.status(404).json({ message: 'الطلب غير موجود' });

    if (order.customer_id?.toString() !== customer_id.toString())
      return res.status(403).json({ message: 'مش مسموح' });

    const cancellableStatuses = ['pending', 'admin_approved'];
    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({
        message: 'لا يمكن إلغاء الطلب في هذه المرحلة، يرجى التواصل مع الدعم',
        contactSupport: true
      });
    }

    order.status = 'cancelled';
    order.cancellation = {
      cancelledAt: new Date(),
      reason:      reason || 'إلغاء من العميل',
      cancelledBy: 'customer',
    };
    await order.save();

    res.json({ message: 'تم إلغاء الطلب بنجاح' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'حدث خطأ في إلغاء الطلب' });
  }
};

// ── الأدمن يوافق ─────────────────────────────────────────
const adminApproveOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { notes, approved } = req.body;

    const order = await Order.findOne({ orderId: Number(orderId) });
    if (!order) return res.status(404).json({ message: 'الطلب غير موجود' });

    order.adminApproval = { approved, admin_id: req.user.userId, approvedAt: new Date(), notes };
    order.status = approved ? 'admin_approved' : 'rejected';
    await order.save();

    res.json({ message: approved ? 'تمت الموافقة' : 'تم الرفض', order });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ' });
  }
};

// ── السبلير يوافق أو يرفض ────────────────────────────────
const supplierApproveOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { notes, approved, deliveryDate } = req.body;

    const order = await Order.findOne({ orderId: Number(orderId) });
    if (!order) return res.status(404).json({ message: 'الطلب غير موجود' });

    if (order.status !== 'admin_approved')
      return res.status(400).json({ message: 'الطلب لم يتم اعتماده من الأدمن بعد' });

    order.supplierApproval = {
      approved,
      supplier_id:  req.user.userId,
      approvedAt:   new Date(),
      deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
      notes,
    };
    order.status = approved ? 'supplier_approved' : 'rejected';
    await order.save();

    // ── تحديث إحصائيات السبلير ──────────────────────────
    try {
      const supplier = await Supplier.findById(req.user.userId);
      if (supplier) await supplier.recordDecision(approved);
    } catch (statsErr) {
      console.warn('⚠️ فشل تحديث إحصائيات السبلير:', statsErr.message);
    }

    res.json({ message: approved ? 'تمت الموافقة' : 'تم الرفض', order });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ' });
  }
};

// ── الأدمن يحدّث الأوردر لـ shipped ─────────────────────
const shipOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId: Number(orderId) });
    if (!order) return res.status(404).json({ message: 'الطلب غير موجود' });

    if (order.status !== 'supplier_approved')
      return res.status(400).json({ message: 'الطلب لم تتم موافقة السبلير عليه بعد' });

    order.status = 'shipped';
    await order.save();

    res.json({ message: 'تم تحديث الطلب لـ جاري التوصيل', order });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ' });
  }
};

// ── العميل يأكد الاستلام → customer_confirmed ──────────
const customerConfirmDelivery = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId: Number(orderId) });
    if (!order) return res.status(404).json({ message: 'الطلب غير موجود' });

    if (order.status !== 'shipped')
      return res.status(400).json({ message: 'الطلب لم يتم شحنه بعد' });

    if (order.customer_id?.toString() !== req.user.userId.toString())
      return res.status(403).json({ message: 'مش مسموح' });

    order.status = 'customer_confirmed';
    order.delivery = {
      confirmedAt:   new Date(),
      confirmedBy:   'customer',
      confirmedById: req.user.userId,
    };
    await order.save();

    res.json({ message: 'تم تأكيد الاستلام، في انتظار تأكيد الأدمن', order });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ' });
  }
};
// ── تسليم الأوردر (delivered) — بيستدعيه الأدمن ─────────
const deliverOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId: Number(orderId) });
    if (!order) return res.status(404).json({ message: 'الطلب غير موجود' });

    if (!['shipped', 'customer_confirmed'].includes(order.status))
      return res.status(400).json({ message: 'الطلب مش في مرحلة التسليم' });

    order.status = 'delivered';
    order.delivery = {
      confirmedAt:   new Date(),
      confirmedBy:   'admin',
      confirmedById: req.user.userId,
    };
    await order.save();

    // ── تحديث إحصائيات السبلير ──
    try {
      const supplierId = order.supplierApproval?.supplier_id;
      if (supplierId) {
        const supplier = await Supplier.findById(supplierId);
        if (supplier) {
          const deliveryDate = order.supplierApproval?.deliveryDate;
          const onTime = deliveryDate ? new Date() <= new Date(deliveryDate) : false;
          await supplier.recordDelivery(onTime);
        }
      }
    } catch (statsErr) {
      console.warn('⚠️ فشل تحديث إحصائيات التسليم:', statsErr.message);
    }

    res.json({ message: 'تم تسليم الطلب بنجاح', order });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ' });
  }
};

// ── طلبات العميل ──────────────────────────────────────────
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer_id: req.user.userId }).sort({ createdAt: -1 });
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ' });
  }
};

// ── كل الطلبات للأدمن ─────────────────────────────────────
const getAllOrders = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const orders = await Order.find(filter)
      .populate('customer_id',                 'F_name L_name Phone')
      .populate('adminApproval.admin_id',       'name')
      .populate('supplierApproval.supplier_id', 'name company')
      .sort({ createdAt: -1 });
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ' });
  }
};

module.exports = {
  createOrder,
  cancelOrder,
  adminApproveOrder,
  supplierApproveOrder,
  shipOrder,
  deliverOrder,   // ← جديد
  getMyOrders,
  getAllOrders,
  customerConfirmDelivery,
};