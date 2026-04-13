// المتغير ده بيحدد URL الـ API
// في التطوير: 
// في الـ production: نفس الدومين (لأن Express بيخدم React)
const API = process.env.REACT_APP_API_URL || '';

export default API;
