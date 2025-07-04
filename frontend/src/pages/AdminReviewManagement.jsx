//D:\hellopiggy\frontend\src\pages\AdminReviewManagement.jsx (수정된 최종 버전)

import { useEffect, useState, useMemo } from 'react';
import { db, collection, getDocs, query, orderBy, updateDoc, doc, where, serverTimestamp, getDoc } from '../firebaseConfig';
import Papa from 'papaparse';
import ReviewDetailModal from '../components/ReviewDetailModal';

const getStatusText = (status) => {
  switch (status) {
    case 'review_completed': return '리뷰 완료';
    case 'rejected': return '반려됨';
    case 'submitted':
    default: return '구매 완료';
  }
};

export default function AdminReviewManagement() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);

  const fetchReviews = async () => {
    setLoading(true);
    const q = query(collection(db, 'reviews'), where('status', 'in', ['submitted', null, 'review_completed', 'rejected']), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const reviewsData = await Promise.all(snap.docs.map(async (d) => {
      const review = { id: d.id, ...d.data() };
      if (review.subAccountId) {
        const subAccountRef = doc(db, 'subAccounts', review.subAccountId);
        const subAccountSnap = await getDoc(subAccountRef);
        if (subAccountSnap.exists()) {
          review.subAccountName = subAccountSnap.data().name;
        }
      }
      // mainAccountId는 이제 uid입니다. 이 uid를 사용해 'users' 컬렉션을 조회합니다.
      if (review.mainAccountId) {
        const userDocRef = doc(db, 'users', review.mainAccountId);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          review.mainAccountName = userDocSnap.data().name; // users 컬렉션에서 이름 가져오기
        }
      }
      return review;
    }));
    setRows(reviewsData);
    setLoading(false);
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const filteredRows = useMemo(() => {
    if (!search) return rows;
    const s = search.toLowerCase();
    return rows.filter((r) =>
      [ r.createdAt?.seconds ? new Date(r.createdAt.seconds * 1000).toLocaleString() : '', r.participantId, r.name, r.mainAccountName, r.subAccountName, r.phoneNumber, r.title, ].join(' ').toLowerCase().includes(s)
    );
  }, [rows, search]);

  const toggleSelect = (id) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelected(newSelected);
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) setSelected(new Set(filteredRows.map((r) => r.id)));
    else setSelected(new Set());
  };

  const handleVerify = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`${selected.size}개의 항목을 리뷰 인증 처리하고 정산내역으로 넘기시겠습니까?`)) return;
    for (const id of selected) {
      await updateDoc(doc(db, 'reviews', id), { status: 'verified', verifiedAt: serverTimestamp() });
    }
    alert('리뷰 인증이 완료되었습니다.');
    setRows(rows.filter(r => !selected.has(r.id)));
    setSelected(new Set());
  };

  const handleReject = async (id) => {
    const reason = prompt("반려 사유를 입력하세요:");
    if (reason === null || !reason.trim()) {
      if(reason !== null) alert("반려 사유를 반드시 입력해야 합니다.");
      return;
    }
    if (window.confirm(`이 리뷰를 반려 처리하시겠습니까?\n사유: ${reason}`)) {
      try {
        await updateDoc(doc(db, 'reviews', id), { status: 'rejected', rejectionReason: reason.trim(), rejectedAt: serverTimestamp() });
        alert('리뷰가 반려 처리되었습니다.');
        fetchReviews();
      } catch (e) {
        alert('처리 중 오류가 발생했습니다: ' + e.message);
      }
    }
  };


  const downloadCsv = () => {
    const csvData = filteredRows.map((r, i) => ({
      '순번': i + 1,
      '등록일시': r.createdAt?.seconds ? new Date(r.createdAt.seconds * 1000).toLocaleString() : '',
      '리뷰 제목': r.title,
      '상품명': r.participantId || '-',
      '본계정 이름': r.mainAccountName || '-',
      '타계정 이름': r.subAccountName || '-',
      '전화번호': r.phoneNumber,
      '리뷰 제출': r.confirmImageUrls && r.confirmImageUrls.length > 0 ? 'O' : 'X',
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reviews_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
    // 3. 모달을 열고 닫는 함수 추가
  const openDetailModal = (review) => {
    setSelectedReview(review);
    setIsModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsModalOpen(false);
    setSelectedReview(null);
  };

  if (loading) return <p>리뷰 정보를 불러오는 중...</p>;

  return (
    <>
      <h2>리뷰 관리 ({filteredRows.length})</h2>
      <div className="toolbar">
        <button onClick={handleVerify} disabled={selected.size === 0}>선택 항목 리뷰 인증</button>
        <input placeholder="검색" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button onClick={downloadCsv}>엑셀 다운로드</button>
      </div>
      <table>
        <thead>
          <tr>
            <th><input type="checkbox" checked={selected.size === filteredRows.length && filteredRows.length > 0} onChange={toggleSelectAll} /></th>
            <th>순번</th>
            <th>등록일시</th>
            <th>상태</th> {/* 상태 컬럼 추가 */}
            <th>리뷰 제목</th>
            <th>상품명</th>
            <th>본계정 이름</th>
            <th>타계정 이름</th>
            <th>전화번호</th>
            <th>리뷰 확인</th> {/* 4. 컬럼명 변경/추가 */}            
            <th>작업</th> {/* 반려 버튼을 위한 컬럼 */}
          </tr>
        </thead>
        <tbody>
          {filteredRows.map((r, idx) => (
            <tr key={r.id}>
              <td><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} /></td>
              <td>{idx + 1}</td>
              <td>{r.createdAt?.seconds ? new Date(r.createdAt.seconds * 1000).toLocaleString() : ''}</td>
              <td>{getStatusText(r.status)}</td> {/* 상태 텍스트 표시 */}
              <td>{r.title}</td>
              <td>{r.participantId || '-'}</td>
              <td>{r.mainAccountName || '-'}</td>
              <td>{r.subAccountName || '-'}</td>
              <td>{r.phoneNumber}</td>
              {/* 5. 클릭 가능한 'O' / 'X' 버튼으로 변경 */}
              <td>
                <button 
                  className={`link-button ${r.confirmImageUrls?.length > 0 ? 'completed' : ''}`}
                  onClick={() => openDetailModal(r)}
                >
                  {r.confirmImageUrls?.length > 0 ? 'O' : 'X'}
                </button>
              </td>
              <td>
                <button onClick={() => handleReject(r.id)} className="reject-button">반려</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 6. 모달을 렌더링하는 코드 추가 */}
      {isModalOpen && (
        <ReviewDetailModal 
          review={selectedReview} 
          onClose={closeDetailModal} 
        />
      )}
    </>
  );
}
