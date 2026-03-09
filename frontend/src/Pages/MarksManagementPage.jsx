import { useState, useEffect } from 'react';
import {
  collection, addDoc, getDocs,
  query, where, deleteDoc, doc
} from 'firebase/firestore';
import { db } from '../firebase';
import Papa from 'papaparse';
import Navbar from '../Components/Navbar';
import Toast from '../Components/Toast';
import { useAuth } from '../context/AuthContext';

export default function MarksManagementPage() {

  const { user } = useAuth();

  // faculty AND hod can edit — only student is read-only
  const canEdit = user?.role === "faculty" || user?.role === "hod";

  const [students, setStudents]     = useState([]);
  const [allMarks, setAllMarks]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [uploading, setUploading]   = useState(false);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [activeTab, setActiveTab]   = useState("view");
  const [search, setSearch]         = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [formRows, setFormRows] = useState([
    { subject: "", internal1: "", internal2: "", internal3: "", upc_days: "" }
  ]);

  const [toast, setToast] = useState({ message: "", type: "success" });

  useEffect(() => { loadData(); }, []);

  const showToast = (message, type = "success") => setToast({ message, type });
  const closeToast = () => setToast({ message: "", type: "success" });

  const loadData = async () => {
    setLoading(true);
    try {
      const studentsSnap = await getDocs(collection(db, "students"));
      const marksSnap    = await getDocs(collection(db, "marks"));
      setStudents(studentsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setAllMarks(marksSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      showToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCSVUpload = async (e) => {
    if (!canEdit) { showToast("Only faculty or HOD can upload marks", "error"); return; }
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rollMap = {};
          students.forEach(s => { rollMap[s.roll] = s; });
          for (const row of results.data) {
            const student = rollMap[row.roll];
            if (!student) continue;
            const subject = row.subject;
            const i1 = Number(row.internal1 || 0);
            const i2 = Number(row.internal2 || 0);
            const i3 = Number(row.internal3 || 0);
            const avgInternal = ((i1 + i2 + i3) / 3).toFixed(2);
            const existing = await getDocs(query(collection(db, "marks"),
              where("studentId", "==", student.id), where("subject", "==", subject)));
            for (const d of existing.docs) await deleteDoc(doc(db, "marks", d.id));
            await addDoc(collection(db, "marks"), {
              studentId: student.id, studentName: student.name,
              roll: student.roll, subject, internal1: i1,
              internal2: i2, internal3: i3, avgInternal
            });
          }
          showToast("Marks uploaded successfully");
          loadData();
        } catch (err) {
          showToast(err.message, "error");
        } finally {
          setUploading(false);
          e.target.value = "";
        }
      }
    });
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!canEdit) { showToast("Only faculty or HOD can modify marks", "error"); return; }
    if (!selectedStudent) { showToast("Select a student first", "error"); return; }
    const student = students.find(s => s.id === selectedStudent);
    setUploading(true);
    try {
      for (const row of formRows) {
        if (!row.subject) continue;
        const i1 = Number(row.internal1 || 0);
        const i2 = Number(row.internal2 || 0);
        const i3 = Number(row.internal3 || 0);
        const avgInternal = ((i1 + i2 + i3) / 3).toFixed(2);
        const existing = await getDocs(query(collection(db, "marks"),
          where("studentId", "==", student.id), where("subject", "==", row.subject)));
        for (const d of existing.docs) await deleteDoc(doc(db, "marks", d.id));
        await addDoc(collection(db, "marks"), {
          studentId: student.id, studentName: student.name,
          roll: student.roll, subject: row.subject,
          internal1: i1, internal2: i2, internal3: i3, avgInternal
        });
      }
      showToast("Marks saved successfully");
      setFormRows([{ subject: "", internal1: "", internal2: "", internal3: "", upc_days: "" }]);
      setSelectedStudent("");
      loadData();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMark = async (markId) => {
    try {
      await deleteDoc(doc(db, "marks", markId));
      showToast("Mark deleted");
      setDeleteConfirm(null);
      loadData();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const updateFormRow = (idx, field, value) => {
    setFormRows(rows => rows.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const addFormRow = () => {
    setFormRows(rows => [...rows, { subject: "", internal1: "", internal2: "", internal3: "", upc_days: "" }]);
  };

  const removeFormRow = (idx) => {
    setFormRows(rows => rows.filter((_, i) => i !== idx));
  };

  // Group marks by student
  const marksByStudent = {};
  allMarks.forEach(m => {
    if (!marksByStudent[m.studentId]) marksByStudent[m.studentId] = [];
    marksByStudent[m.studentId].push(m);
  });

  const filteredStudents = students.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.roll?.toLowerCase().includes(search.toLowerCase())
  );

  const getRiskColor = (avg) => {
    const pct = (Number(avg) / 50) * 100;
    if (pct < 40) return { color: "#dc2626", bg: "#fef2f2", label: "At Risk" };
    if (pct < 60) return { color: "#d97706", bg: "#fffbeb", label: "Average" };
    return { color: "#16a34a", bg: "#f0fdf4", label: "Good" };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <Toast message={toast.message} type={toast.type} onClose={closeToast} />

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Mark?</h3>
            <p className="text-sm text-gray-500 mb-6">
              This will permanently remove <strong>{deleteConfirm.subject}</strong> marks for <strong>{deleteConfirm.studentName}</strong>.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDeleteMark(deleteConfirm.id)}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Marks Management</h1>
            <p className="text-sm text-gray-500 mt-1">
              {canEdit
                ? `Logged in as ${user?.role === "hod" ? "HOD" : "Faculty"} — full edit access`
                : "Student view — read only"}
            </p>
          </div>

          {canEdit && (
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("view")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "view"
                    ? "bg-gray-900 text-white"
                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                View Marks
              </button>
              <button
                onClick={() => setActiveTab("manual")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "manual"
                    ? "bg-gray-900 text-white"
                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                + Enter Marks
              </button>
              <button
                onClick={() => setActiveTab("upload")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "upload"
                    ? "bg-gray-900 text-white"
                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                ↑ Upload CSV
              </button>
            </div>
          )}
        </div>

        {/* CSV UPLOAD TAB */}
        {canEdit && activeTab === "upload" && (
          <div className="bg-white border border-gray-200 rounded-xl p-8 mb-6 text-center">
            <div className="text-4xl mb-3">📂</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Upload CSV File</h3>
            <p className="text-sm text-gray-500 mb-2">
              Required columns: <code className="bg-gray-100 px-1 rounded text-xs">roll, subject, internal1, internal2, internal3</code>
            </p>
            <label className="inline-block mt-4 cursor-pointer">
              <span className={`px-6 py-3 rounded-lg text-sm font-medium text-white ${uploading ? "bg-gray-400" : "bg-gray-900 hover:bg-gray-800"}`}>
                {uploading ? "Uploading..." : "Choose CSV File"}
              </span>
              <input
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* MANUAL ENTRY TAB */}
        {canEdit && activeTab === "manual" && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Enter Marks Manually</h3>
            <form onSubmit={handleManualSubmit}>

              {/* Student selector */}
              <div className="mb-5">
                <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                  Select Student
                </label>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full sm:w-72 px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option value="">— Choose a student —</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.roll})</option>
                  ))}
                </select>
              </div>

              {/* Subject rows */}
              <div className="space-y-3 mb-5">
                <div className="hidden sm:grid grid-cols-6 gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide px-1">
                  <span className="col-span-2">Subject</span>
                  <span>Internal 1</span>
                  <span>Internal 2</span>
                  <span>Internal 3</span>
                  <span></span>
                </div>

                {formRows.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-center">
                    <input
                      value={row.subject}
                      onChange={(e) => updateFormRow(idx, "subject", e.target.value)}
                      placeholder="Subject code"
                      className="col-span-2 sm:col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="number"
                      value={row.internal1}
                      onChange={(e) => updateFormRow(idx, "internal1", e.target.value)}
                      placeholder="0"
                      min="0"
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="number"
                      value={row.internal2}
                      onChange={(e) => updateFormRow(idx, "internal2", e.target.value)}
                      placeholder="0"
                      min="0"
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="number"
                      value={row.internal3}
                      onChange={(e) => updateFormRow(idx, "internal3", e.target.value)}
                      placeholder="0"
                      min="0"
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeFormRow(idx)}
                      disabled={formRows.length === 1}
                      className="text-red-400 hover:text-red-600 text-lg disabled:opacity-30"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={addFormRow}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  + Add Subject
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className={`px-6 py-2 rounded-lg text-sm font-medium text-white ${uploading ? "bg-gray-400" : "bg-gray-900 hover:bg-gray-800"}`}
                >
                  {uploading ? "Saving..." : "Save Marks"}
                </button>
              </div>

            </form>
          </div>
        )}

        {/* VIEW TAB — shown by default, also always shown for students */}
        {(activeTab === "view" || !canEdit) && (
          <>
            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by student name or roll number..."
                className="w-full sm:w-80 px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
                Loading marks...
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-20 text-gray-400 text-sm">No students found.</div>
            ) : (
              <div className="space-y-4">
                {filteredStudents.map(student => {
                  const marks = marksByStudent[student.id] || [];
                  return (
                    <div key={student.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">

                      {/* Student header */}
                      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600">
                            {student.name?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 text-sm">{student.name}</div>
                            <div className="text-xs text-gray-400">{student.roll} · {student.dept || student.department || "—"}</div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-400">
                          {marks.length} subject{marks.length !== 1 ? "s" : ""}
                        </div>
                      </div>

                      {/* Marks table */}
                      {marks.length === 0 ? (
                        <div className="px-5 py-4 text-sm text-gray-400 italic">No marks recorded yet.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                                <th className="text-left px-5 py-3 font-medium">Subject</th>
                                <th className="text-center px-4 py-3 font-medium">Int 1</th>
                                <th className="text-center px-4 py-3 font-medium">Int 2</th>
                                <th className="text-center px-4 py-3 font-medium">Int 3</th>
                                <th className="text-center px-4 py-3 font-medium">Average</th>
                                <th className="text-center px-4 py-3 font-medium">Status</th>
                                {canEdit && <th className="text-center px-4 py-3 font-medium">Action</th>}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {marks.map(mark => {
                                const risk = getRiskColor(mark.avgInternal);
                                return (
                                  <tr key={mark.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-5 py-3 font-medium text-gray-800">{mark.subject}</td>
                                    <td className="px-4 py-3 text-center text-gray-600">{mark.internal1 ?? "—"}</td>
                                    <td className="px-4 py-3 text-center text-gray-600">{mark.internal2 ?? "—"}</td>
                                    <td className="px-4 py-3 text-center text-gray-600">{mark.internal3 ?? "—"}</td>
                                    <td className="px-4 py-3 text-center font-semibold" style={{ color: risk.color }}>
                                      {mark.avgInternal}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                      <span
                                        className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full"
                                        style={{ color: risk.color, background: risk.bg }}
                                      >
                                        {risk.label}
                                      </span>
                                    </td>
                                    {canEdit && (
                                      <td className="px-4 py-3 text-center">
                                        <button
                                          onClick={() => setDeleteConfirm({ id: mark.id, subject: mark.subject, studentName: student.name })}
                                          className="text-xs text-red-400 hover:text-red-600 font-medium"
                                        >
                                          Delete
                                        </button>
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

      </main>
    </div>
  );
}