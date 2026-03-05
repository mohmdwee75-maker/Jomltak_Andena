import React, { useState } from 'react';
import './AccountSettings.css';
import { Link } from 'react-router-dom';

const AccountSettings = () => {
  const [activeSection, setActiveSection] = useState('profile');

  return (
    <div className="settings-content">
      <div className="settings-cards">
        <div 
          className={`settings-card ${activeSection === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveSection('profile')}
        >
          <Link to ="/profile-details?Flage_maping=1" className='Link'>
          <div className="card-icon">👤</div>
          
          <div className="card-text">
            <h3>تفاصيل الملف الشخصي</h3>
            <p>تفضيل أساسية</p>
          </div></Link>
          
        </div>
        
        
        <div 
          className={`settings-card ${activeSection === 'security' ? 'active' : ''}`}
          onClick={() => setActiveSection('security')}
        >
          <Link to="/create-password?Flage_maping=1" className='Link'>
          <div className="card-icon">🔒</div>
          <div className="card-text">
            <h3>إعدادات الأمان</h3>
            <p>تغيير كلمة المرور</p>
          </div>
          </Link>
        </div>



        <div 
          className={`settings-card ${activeSection === 'delete' ? 'active' : ''}`}
          onClick={() => setActiveSection('delete')}
        >
          <div className="card-icon delete-icon">🗑️</div>
          <div className="card-text">
            <h3 className="delete-text">حذف الحساب</h3>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;