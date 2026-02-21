import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, collection, addDoc, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import Navbar from '../Components/Navbar';
import Toast from '../Components/Toast';

export default function StudentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [marks, setMarks] = useState([]);
  const [interventions, setInterventions] = useState([]);
  const [showInterventionForm, setShowInterventionForm] = useState(false);
  const [interventionForm, setInterventionForm] = useState({ type: 'counseling', note: '' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const showToast = (message, type = 'success') => setToast({ message, type });
  const closeToast = () => setToast({ message: '', type: 'success' });

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const docRef = doc(db, 'students', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setStudent({ id: docSnap.id, ...docSnap.data() });
        else setStudent(null);
      } catch (err) {
        console.error(err);
        showToast('Failed to load student', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchStudent();
  }, [id]);

  useEffect(() => {
    const fetchMarks = async () => {
      try {
        const q = query(collection(db, 'marks'), where('studentId', '==', id));
        const snap = await getDocs(q);
        setMarks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) { console.error(err); }
    };
    fetchMarks();
  }, [id]);

  useEffect(() => {
    const q = query(collection(db, 'interventions'), where('studentId', '==', id));
    const unsub = onSnapshot(q, (snap) => {
      setInterventions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [id]);

  const calculateRiskFromMarks = () => {
    if (marks.length === 0) return student?.risk || 0;
    let totalRiskPoints = 0, maxRiskPoints = 0;
    marks.forEach(m => {
      const avgPct = (m.avgInternal / 50) * 100;
      if (avgPct < 40) totalRiskPoints += 40;
      else if (avgPct < 60) totalRiskPoints += 20;
      maxRiskPoints += 40;
      if (m.hasUPC) {
        const upcPct = (m.upc_days / 10) * 100;
        if (upcPct < 50) totalRiskPoints += 30;
        else if (upcPct < 70) totalRiskPoints += 15;
        maxRiskPoints += 30;
      }
    });
    if (student?.attendance < 50) totalRiskPoints += 30;
    else if (student?.attendance < 75) totalRiskPoints += 15;
    maxRiskPoints += 30;
    return Math.round((totalRiskPoints / maxRiskPoints) * 100);
  };

  const computedRisk = calculateRiskFromMarks();

  const getSubjectRisk = (mark) => {
    const avgPct = (mark.avgInternal / 50) * 100;
    const upcPct = mark.hasUPC ? (mark.upc_days / 10) * 100 : 100;
    if (avgPct < 40 || (mark.hasUPC && upcPct < 50)) return 'high';
    if (avgPct < 60 || (mark.hasUPC && upcPct < 70)) return 'medium';
    return 'low';
  };

  const getRiskLevel = (risk) => {
    if (risk >= 70) return { label: 'HIGH', text: 'text-red-700', badge: 'bg-red-100' };
    if (risk >= 40) return { label: 'MEDIUM', text: 'text-yellow-700', badge: 'bg-yellow-100' };
    return { label: 'LOW', text: 'text-green-700', badge: 'bg-green-100' };
  };

  const riskLevel = getRiskLevel(computedRisk);
  const atRiskSubjects = marks.filter(m => getSubjectRisk(m) !== 'low');

  const handleAddIntervention = async (e) => {
    e.preventDefault();
    if (!interventionForm.note.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'interventions'), {
        studentId: id, studentName: student.name,
        type: interventionForm.type, note: interventionForm.note,
        createdBy: currentUser?.email || 'Faculty', createdAt: new Date(), status: 'done'
      });
      setInterventionForm({ type: 'counseling', note: '' });
      setShowInterventionForm(false);
      showToast('Intervention saved successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to save intervention', 'error');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex items-center justify-center h-96"><p className="text-gray-500">Loading student...</p></div>
    </div>
  );

  if (!student) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Student not found</p>
          <button onClick={() => navigate('/dashboard')} className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm">Back to Dashboard</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <Toast message={toast.message} type={toast.type} onClose={closeToast} />

        <button onClick={() => navigate('/dashboard')} className="text-sm text-gray-500 hover:text-gray-700 mb-6 flex items-center gap-1">
          ← Back to Dashboard
        </button>

        {/* Student Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{student.name}</h2>
            <p className="text-gray-500 mt-1">Roll: {student.roll}</p>
            <p className="text-gray-500">Department: {student.dept}</p>
            <p className="text-gray-500">Attendance: {student.attendance}%</p>
          </div>
          <div className={`px-6 py-4 rounded-lg text-center ${riskLevel.badge}`}>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Risk Score</p>
            <p className={`text-4xl font-bold ${riskLevel.text}`}>{computedRisk}%</p>
            <p className={`text-xs font-medium ${riskLevel.text} uppercase mt-1`}>{riskLevel.label}</p>
            {marks.length > 0 && <p className="text-xs text-gray-400 mt-1">Based on marks</p>}
          </div>
        </div>

        {/* Why at risk */}
        {atRiskSubjects.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Why is this student at risk?</h3>
            <div className="space-y-3">
              {atRiskSubjects.map(m => {
                const risk = getSubjectRisk(m);
                const avgPct = Math.round((m.avgInternal / 50) * 100);
                return (
                  <div key={m.id} className={`p-3 rounded-lg border ${risk === 'high' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800">{m.subject}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${risk === 'high' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{risk.toUpperCase()}</span>
                    </div>
                    <div className="mt-1 text-sm text-gray-600 flex gap-4">
                      <span>Avg Internal: <strong>{m.avgInternal}/50</strong> ({avgPct}%)</span>
                      {m.hasUPC && <span>UPC Days: <strong>{m.upc_days}/10</strong></span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Marks Table */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Subject-wise Marks</h3>
            <button onClick={() => navigate('/marks-management')} className="text-sm text-purple-600 hover:text-purple-800">+ Upload Marks</button>
          </div>
          {marks.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No marks uploaded yet.</p>
              <button onClick={() => navigate('/marks-management')} className="mt-2 text-purple-600 hover:text-purple-800 text-sm">Upload marks →</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Internal 1</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Internal 2</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Internal 3</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Average</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">UPC Days</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {marks.map(m => {
                    const risk = getSubjectRisk(m);
                    const avgPct = Math.round((m.avgInternal / 50) * 100);
                    return (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{m.subject}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{m.internal1}/50</td>
                        <td className="px-4 py-3 text-center text-gray-600">{m.internal2}/50</td>
                        <td className="px-4 py-3 text-center text-gray-600">{m.internal3}/50</td>
                        <td className="px-4 py-3 text-center"><span className="font-medium text-gray-900">{m.avgInternal}/50</span><span className="text-xs text-gray-400 ml-1">({avgPct}%)</span></td>
                        <td className="px-4 py-3 text-center text-gray-600">{m.hasUPC ? `${m.upc_days}/10` : '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${risk === 'high' ? 'bg-red-100 text-red-700' : risk === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                            {risk.charAt(0).toUpperCase() + risk.slice(1)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Attendance */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance</h3>
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-gray-700">Overall Attendance</span>
            <span className="font-medium text-gray-900">{student.attendance}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div className={`h-3 rounded-full transition-all ${student.attendance >= 75 ? 'bg-green-500' : student.attendance >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${student.attendance}%` }}></div>
          </div>
          {student.attendance < 75 && <p className="text-xs text-red-600 mt-2">Below 75% minimum attendance requirement</p>}
        </div>

        {/* Interventions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Interventions</h3>
            <span className="text-sm text-gray-500">{interventions.length} logged</span>
          </div>
          {interventions.length > 0 && (
            <div className="space-y-3 mb-4">
              {interventions.map((inv) => (
                <div key={inv.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 capitalize">{inv.type.replace('_', ' ')}</span>
                      <span className="text-xs text-gray-400">{formatDate(inv.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{inv.note}</p>
                    <p className="text-xs text-gray-400 mt-1">By: {inv.createdBy}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {showInterventionForm ? (
            <form onSubmit={handleAddIntervention} className="border border-gray-200 rounded-lg p-4 space-y-3">
              <select value={interventionForm.type} onChange={(e) => setInterventionForm({ ...interventionForm, type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="counseling">Counseling Session</option>
                <option value="parent_notified">Parent Notified</option>
                <option value="academic_support">Academic Support</option>
                <option value="warning_issued">Warning Issued</option>
              </select>
              <textarea placeholder="Describe the action taken..." value={interventionForm.note} onChange={(e) => setInterventionForm({ ...interventionForm, note: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" rows={3} required />
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="flex-1 bg-purple-600 text-white py-2 rounded-md text-sm hover:bg-purple-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save Intervention'}</button>
                <button type="button" onClick={() => { setShowInterventionForm(false); setInterventionForm({ type: 'counseling', note: '' }); }} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-md text-sm hover:bg-gray-300">Cancel</button>
              </div>
            </form>
          ) : (
            <button onClick={() => setShowInterventionForm(true)} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-purple-500 hover:text-purple-600 transition">+ Add Intervention</button>
          )}
        </div>
      </main>
    </div>
  );
}