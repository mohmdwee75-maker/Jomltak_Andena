// src/components/OrderStatus.js
import React from 'react';

const OrderStatus = ({ orderId, status }) => {
    return (
        <div>
            <h3>حالة الطلب: {status}</h3>
            <p>رقم الطلب: {orderId}</p>
        </div>
    );
}

export default OrderStatus;
