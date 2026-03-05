// src/pages/Home.js
import React from 'react';
import '../styles.css';


import HeroSection from '../components/HeroSection.module';
import ScrollToTop from '../components/ScrollToTop.module';
import Footer from '../components/Footer.module';
import AccountOverview from '../components/account/AccountOverview';
function My_Acc() {
    return (<>
        <HeroSection showExtra={false} />
        <AccountOverview />
        <Footer />
        <ScrollToTop /></>
    )
}

export default My_Acc;