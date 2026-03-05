// src/pages/Home.js
import React from 'react';
import '../styles.css';

import Header from '../components/Header.module';
import HeroSection from '../components/HeroSection.module';
import ProductSection1 from '../components/ProductSection1.module';
import ProductSection2 from '../components/ProductSection2.module';
import ProductSection3 from '../components/ProductSection3.module';
import ScrollToTop from '../components/ScrollToTop.module';
import Footer from '../components/Footer.module'; 

function App() {
  
  return (
    <div className="App">
      <Header />
      <HeroSection />
      <ProductSection1 />
      <ProductSection2 />
      <ProductSection3 showCategoryFilter={false} showBrandFilter={false}  showSimilarTags={false} showActiveFilters={true} showDiscountFilter={false} />
      <Footer />
      <ScrollToTop /> 
    </div>
  );
}

export default App;