// src/pages/AdminProductForm.jsx (조건부 리뷰 옵션 추가)

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db, collection, addDoc, serverTimestamp, updateDoc, doc, getDoc } from '../firebaseConfig';

const progressStatusOptions = ['진행전', '진행중', '진행완료', '일부완료', '보류'];
const productTypeOptions = ['실배송', '빈박스'];
const reviewTypeOptions = ['현영', '자율결제'];

// ▼▼▼ '실배송'과 '빈박스'에 대한 리뷰 옵션을 별도로 정의합니다 ▼▼▼
const fullReviewOptions = ['별점', '텍스트', '포토', '프리미엄포토', '프리미엄영상'];
const limitedReviewOptions = ['별점', '텍스트'];

const initialFormState = {
  productName: '',
  reviewType: '현영',
  guide: `현영(지출증빙): 736-28-00836, 7362800836
🚫상품명 검색 금지🚫
🚫타계 동일 연락처, 동일 주소 중복 불가🚫
🚫여러 상품 진행 시 장바구니 결제🚫
✅키워드 검색 후 (가격 검색 필수) [찜🩷]
 + 체류 2분 후 [장바구니🛒] > [바로구매] 

⚠ 가이드의 상품 옵션 그대로 구매 진행 
⚠ 옵션 변경 시 페이백 불가 

✅리뷰 가이드🙇 📸 포토 리뷰(포토 3장 + 텍스트 3줄 이상 + 별점 5점) 

✅구매 후 업로드!
 - 구매 인증 시 상품명, 옵션 확인 안될 경우 페이백 불가
 - 현금영수증(지출증빙) 7362800836 입력 인증 필수! 

✅리뷰 인증 페이지!
 - https://hellopiggy.netlify.app/my-reviews

✅ 페이백 - 리뷰 인증 확인 후 48시간 이내 페이백 (입금자명 : 강예슬)
 - 페이백 확인이 안될 경우 개인톡❌
 - 1:1 문의방으로 문의해 주세요
  → https://open.kakao.com/o/sscJn3wh
 - 입장 후 구매일자, 구매상품을 말씀해 주시면 더 빠른 확인이 가능해요!`,
  reviewDate: '',
  progressStatus: '진행중',
  productType: '실배송',
  reviewOption: '포토',
};

export default function AdminProductForm() {
  const { productId } = useParams();
  const isEditMode = Boolean(productId);

  const [form, setForm] = useState(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEditMode);
  const navigate = useNavigate();

  useEffect(() => {
    if (isEditMode) {
      const fetchProductData = async () => {
        const docRef = doc(db, 'products', productId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setForm({ ...initialFormState, ...docSnap.data() });
        } else {
          alert('해당 상품 정보를 찾을 수 없습니다.');
          navigate('/admin/products');
        }
        setLoading(false);
      };
      fetchProductData();
    }
  }, [isEditMode, productId, navigate]);

  // ▼▼▼ 이 함수를 수정합니다 ▼▼▼
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'productType') {
      // '상품 종류'가 변경되면 '리뷰 종류'를 '별점'으로 초기화합니다.
      setForm(prev => ({
        ...prev,
        productType: value,
        reviewOption: '별점', // 안전한 기본값으로 리셋
      }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.productName || !form.reviewType || !form.reviewDate) {
      alert('상품명, 결제 종류, 진행일자는 필수 항목입니다.');
      return;
    }
    setIsSubmitting(true);
    try {
      const dataToSave = { ...form };
      if (isEditMode) {
        const docRef = doc(db, 'products', productId);
        await updateDoc(docRef, dataToSave);
        alert('상품이 성공적으로 수정되었습니다.');
      } else {
        await addDoc(collection(db, 'products'), { ...dataToSave, createdAt: serverTimestamp() });
        alert('상품이 성공적으로 생성되었습니다.');
      }
      navigate('/admin/products');
    } catch (error) {
      alert(`오류가 발생했습니다: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <p>상품 정보를 불러오는 중...</p>;

  // 현재 상품 종류에 맞는 리뷰 옵션 목록을 결정합니다.
  const currentReviewOptions = form.productType === '빈박스' ? limitedReviewOptions : fullReviewOptions;

  return (
    <>
      <h2>{isEditMode ? '상품 수정' : '상품 생성'}</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* 다른 필드들은 그대로 유지 */}
        <div style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
          <label style={{ display: 'inline-block', width: '100px' }}>진행 상태</label>
          <select name="progressStatus" value={form.progressStatus} onChange={handleChange} required style={{width: 'calc(100% - 120px)', padding: '8px'}}>
            {progressStatusOptions.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
        <div style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
          <label style={{ display: 'inline-block', width: '100px' }}>상품명</label>
          <input type="text" name="productName" value={form.productName} onChange={handleChange} placeholder="예: [헬로피기] 베이컨 500g" required style={{width: 'calc(100% - 120px)', padding: '8px'}}/>
        </div>
        <div style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
          <label style={{ display: 'inline-block', width: '100px' }}>결제 종류</label>
          <select name="reviewType" value={form.reviewType} onChange={handleChange} required style={{width: 'calc(100% - 120px)', padding: '8px'}}>
            {reviewTypeOptions.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
          <label style={{ display: 'inline-block', width: '100px' }}>상품 종류</label>
          <select name="productType" value={form.productType} onChange={handleChange} required style={{width: 'calc(100% - 120px)', padding: '8px'}}>
            {productTypeOptions.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* ▼▼▼ 리뷰 종류 드롭다운을 수정합니다 ▼▼▼ */}
        <div style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
          <label style={{ display: 'inline-block', width: '100px' }}>리뷰 종류</label>
          <select name="reviewOption" value={form.reviewOption} onChange={handleChange} required style={{width: 'calc(100% - 120px)', padding: '8px'}}>
            {currentReviewOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        {/* ▲▲▲ 수정 완료 ▲▲▲ */}

        <div style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
          <label style={{ display: 'inline-block', width: '100px' }}>진행일자</label>
          <input type="date" name="reviewDate" value={form.reviewDate} onChange={handleChange} required style={{width: 'calc(100% - 120px)', padding: '8px'}}/>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px' }}>가이드</label>
          <textarea name="guide" value={form.guide} onChange={handleChange} placeholder="리뷰 작성 시 필요한 상세 안내 내용을 입력하세요." style={{ width: '100%', minHeight: '300px', padding: '8px' }}></textarea>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }}>
          <button type="submit" disabled={isSubmitting} style={{padding: '10px 20px', border: 'none', borderRadius: '4px', background: '#000', color: '#fff'}}>{isSubmitting ? '저장 중...' : (isEditMode ? '수정 완료' : '상품 등록')}</button>
          <button type="button" onClick={() => navigate('/admin/products')} disabled={isSubmitting} style={{padding: '10px 20px', border: '1px solid #ccc', borderRadius: '4px', background: '#fff'}}>닫기</button>
        </div>
      </form>
    </>
  );
}