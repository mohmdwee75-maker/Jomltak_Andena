import {React} from 'react';
import HeroSection from '../../components/HeroSection.module';
import Footer from '../../components/Footer.module';
import ProductPage from './ProductPage.module';
import ProductSection3 from '../../components/ProductSection3.module';
import ScrollToTop from '../../components/ScrollToTop.module';
import { useParams } from 'react-router-dom';
function MainProductPage() {
  const { id } = useParams();

  return (
    <div className="App">
      <HeroSection showExtra={false} />
      <ProductPage key={id} />
      <ProductSection3 
        showCategoryFilter={false} 
        showBrandFilter={false}  
        showSimilarTags={false} 
        showActiveFilters={true} 
        showDiscountFilter={false} 
      />
      <ScrollToTop />
      <Footer />
    </div>
  );
}

export default MainProductPage; 