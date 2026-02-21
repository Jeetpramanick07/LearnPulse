import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc
} from 'firebase/firestore';

import { db } from '../firebase';
import Papa from 'papaparse';

import Navbar from '../Components/Navbar';
import Toast from '../Components/Toast';

import { useAuth } from '../context/AuthContext';

export default function MarksManagementPage() {

  const navigate = useNavigate();

  const { user } = useAuth();

  const isTeacher = user?.role === "teacher";


  const [students, setStudents] = useState([]);
  const [allMarks, setAllMarks] = useState([]);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState("");

  const [formRows, setFormRows] = useState([
    {
      subject: "",
      internal1: "",
      internal2: "",
      internal3: "",
      upc_days: ""
    }
  ]);

  const [activeTab, setActiveTab] = useState("view");

  const [toast, setToast] = useState({
    message: "",
    type: "success"
  });


  useEffect(() => {
    loadData();
  }, []);


  const showToast = (message, type = "success") =>
    setToast({ message, type });


  const closeToast = () =>
    setToast({ message: "", type: "success" });


  const loadData = async () => {

    try {

      const studentsSnap =
        await getDocs(collection(db, "students"));

      const marksSnap =
        await getDocs(collection(db, "marks"));

      setStudents(
        studentsSnap.docs.map(d => ({
          id: d.id,
          ...d.data()
        }))
      );

      setAllMarks(
        marksSnap.docs.map(d => ({
          id: d.id,
          ...d.data()
        }))
      );

    } catch (err) {

      console.error(err);

      showToast("Failed to load data", "error");

    } finally {

      setLoading(false);

    }

  };


  // BLOCK STUDENTS FROM CSV UPLOAD
  const handleCSVUpload = async (e) => {

    if (!isTeacher) {

      showToast("Only teachers can upload marks", "error");

      return;

    }

    const file = e.target.files[0];

    if (!file) return;

    setUploading(true);


    Papa.parse(file, {

      header: true,

      skipEmptyLines: true,

      complete: async (results) => {

        try {

          const rows = results.data;

          const rollMap = {};

          students.forEach(s => {
            rollMap[s.roll] = s;
          });


          for (const row of rows) {

            const student = rollMap[row.roll];

            if (!student) continue;

            const subject = row.subject;

            const i1 = Number(row.internal1 || 0);
            const i2 = Number(row.internal2 || 0);
            const i3 = Number(row.internal3 || 0);

            const avgInternal =
              ((i1 + i2 + i3) / 3).toFixed(2);


            const existing =
              await getDocs(
                query(
                  collection(db, "marks"),
                  where("studentId", "==", student.id),
                  where("subject", "==", subject)
                )
              );


            for (const d of existing.docs)
              await deleteDoc(doc(db, "marks", d.id));


            await addDoc(
              collection(db, "marks"),
              {
                studentId: student.id,
                studentName: student.name,
                roll: student.roll,
                subject,
                internal1: i1,
                internal2: i2,
                internal3: i3,
                avgInternal
              }
            );

          }

          showToast("Marks uploaded successfully");

          loadData();

        } catch (err) {

          showToast(err.message, "error");

        } finally {

          setUploading(false);

        }

      }

    });

  };


  // BLOCK STUDENTS FROM MANUAL SAVE
  const handleManualSubmit = async (e) => {

    e.preventDefault();

    if (!isTeacher) {

      showToast("Only teachers can modify marks", "error");

      return;

    }

    if (!selectedStudent) {

      showToast("Select student", "error");

      return;

    }

    const student =
      students.find(s => s.id === selectedStudent);

    setUploading(true);


    try {

      for (const row of formRows) {

        const subject = row.subject;

        if (!subject) continue;

        const i1 = Number(row.internal1 || 0);
        const i2 = Number(row.internal2 || 0);
        const i3 = Number(row.internal3 || 0);

        const avgInternal =
          ((i1 + i2 + i3) / 3).toFixed(2);


        const existing =
          await getDocs(
            query(
              collection(db, "marks"),
              where("studentId", "==", student.id),
              where("subject", "==", subject)
            )
          );


        for (const d of existing.docs)
          await deleteDoc(doc(db, "marks", d.id));


        await addDoc(
          collection(db, "marks"),
          {
            studentId: student.id,
            studentName: student.name,
            roll: student.roll,
            subject,
            internal1: i1,
            internal2: i2,
            internal3: i3,
            avgInternal
          }
        );

      }

      showToast("Marks saved");

      loadData();

    } catch (err) {

      showToast(err.message, "error");

    } finally {

      setUploading(false);

    }

  };


  const marksByStudent = {};

  allMarks.forEach(m => {

    if (!marksByStudent[m.studentId])
      marksByStudent[m.studentId] = [];

    marksByStudent[m.studentId].push(m);

  });


  return (

    <div className="min-h-screen bg-gray-50">

      <Navbar />

      <main className="max-w-7xl mx-auto p-6">

        <Toast
          message={toast.message}
          type={toast.type}
          onClose={closeToast}
        />


        <div className="flex justify-between items-center mb-6">

          <h2 className="text-2xl font-bold">

            Marks Management
          </h2>


          {isTeacher && (

            <div className="flex gap-3">

              <button
                onClick={() => setActiveTab("upload")}
                className="bg-purple-600 text-white px-4 py-2 rounded"
              >
                Upload CSV
              </button>


              <button
                onClick={() => setActiveTab("manual")}
                className="bg-purple-600 text-white px-4 py-2 rounded"
              >
                Enter Manually
              </button>

            </div>

          )}

        </div>


        {isTeacher && activeTab === "upload" && (

          <input
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
          />

        )}


        {isTeacher && activeTab === "manual" && (

          <form onSubmit={handleManualSubmit}>

            <select
              value={selectedStudent}
              onChange={(e) =>
                setSelectedStudent(e.target.value)
              }
            >

              <option value="">
                Select student
              </option>

              {students.map(s => (

                <option key={s.id} value={s.id}>
                  {s.name}
                </option>

              ))}

            </select>

            <button type="submit">
              Save Marks
            </button>

          </form>

        )}


        {/* VIEW MARKS — BOTH STUDENT & TEACHER */}

        {students.map(student => (

          <div key={student.id}>

            <h3>
              {student.name}
            </h3>

            {(marksByStudent[student.id] || [])
              .map(mark => (

                <div key={mark.id}>
                  {mark.subject} :
                  {mark.avgInternal}
                </div>

              ))}

          </div>

        ))}

      </main>

    </div>

  );

}