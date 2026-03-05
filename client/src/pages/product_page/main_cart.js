import React from 'react';
import HeroSection from '../../components/HeroSection.module';
import Footer from '../../components/Footer.module';
import CartPage from './CartPage';
import ScrollToTop from '../../components/ScrollToTop.module';

function MainCart() {
    return (<>
        <HeroSection showExtra={false} />
        <CartPage />
        <Footer />
        <ScrollToTop />
    </>);}

export default MainCart;