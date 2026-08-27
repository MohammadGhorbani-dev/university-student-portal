import { isSemesterPast } from '../utils/semesterUtils';
import { collection, getDocs, doc, updateDoc, query, orderBy, setDoc, deleteDoc, runTransaction, where, serverTimestamp, getDoc, getCountFromServer, addDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';

const verifyAdminOrStaff = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('شما وارد حساب کاربری نشده‌اید');
  const userDoc = await getDoc(doc(db, 'users', user.uid));
  if (!userDoc.exists()) throw new Error('اطلاعات کاربر یافت نشد');
  const role = userDoc.data().role;
  if (role !== 'admin' && role !== 'staff') {
    throw new Error('شما دسترسی لازم برای این عملیات را ندارید');
  }
};

export const getAnnouncements = async () => {
  try {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id, 
        ...data,
        createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString()
      };
    });
  } catch (error) {
    throw error;
  }
};

export const createAnnouncement = async (data) => {
  try {
    await verifyAdminOrStaff();
    const newDocRef = doc(collection(db, 'announcements'));
    await setDoc(newDocRef, {
      ...data,
      createdAt: serverTimestamp()
    });
    return newDocRef.id;
  } catch (error) {
    throw error;
  }
};

export const updateAnnouncement = async (id, data) => {
  try {
    await verifyAdminOrStaff();
    await updateDoc(doc(db, 'announcements', id), data);
  } catch (error) {
    throw error;
  }
};

export const deleteAnnouncement = async (id) => {
  try {
    await verifyAdminOrStaff();
    await deleteDoc(doc(db, 'announcements', id));
  } catch (error) {
    throw error;
  }
};

export const getCourses = async () => {
  try {
    const q = query(collection(db, 'courses'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  } catch (error) {
    throw error;
  }
};

export const createCourse = async (data) => {
  try {
    await verifyAdminOrStaff();
    const newDocRef = doc(collection(db, 'courses'));
    await setDoc(newDocRef, {
      ...data,
      enrolledCount: 0,
      createdAt: serverTimestamp()
    });
    return newDocRef.id;
  } catch (error) {
    throw error;
  }
};

export const updateCourse = async (id, data) => {
  try {
    await verifyAdminOrStaff();
    await updateDoc(doc(db, 'courses', id), data);
  } catch (error) {
    throw error;
  }
};

export const deleteCourse = async (id) => {
  try {
    await verifyAdminOrStaff();
    await deleteDoc(doc(db, 'courses', id));
  } catch (error) {
    throw error;
  }
};

export const getStudentCourses = async (uid) => {
  try {
    const q = query(
      collection(db, 'course_selections'),
      where('studentUid', '==', uid),
      where('status', '==', 'active')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  } catch (error) {
    throw error;
  }
};

export const getAllCourseSelections = async () => {
  try {
    await verifyAdminOrStaff();
    const q = query(collection(db, 'course_selections'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  } catch (error) {
    throw error;
  }
};

export const registerCourse = async (courseId, studentUid, courseData) => {
  try {
    const courseSemester = courseData.semester;
    if (!courseSemester) {
      throw new Error('این درس فاقد ترم تحصیلی معتبر است و قابل اخذ نیست.');
    }

    // Check maximum 20 credits limit before transaction
    const selectionsRef = collection(db, 'course_selections');
    const q = query(selectionsRef, where('studentUid', '==', studentUid), where('semester', '==', courseSemester), where('status', '==', 'active'));
    const snapshot = await getDocs(q);
    
    let totalCredits = 0;
    snapshot.forEach(doc => {
      totalCredits += (doc.data().credits || 0);
    });

    const newCourseCredits = courseData.credits || 0;
    if (totalCredits + newCourseCredits > 20) {
      throw new Error('مجموع واحدهای انتخابی شما نمی‌تواند بیشتر از ۲۰ واحد باشد.');
    }

    await runTransaction(db, async (transaction) => {
      const courseRef = doc(db, 'courses', courseId);
      const courseSnap = await transaction.get(courseRef);
      
      if (!courseSnap.exists()) {
        throw new Error('درس مورد نظر یافت نشد');
      }

      const currentCount = courseSnap.data().enrolledCount || 0;
      const capacity = courseSnap.data().capacity || 0;
      
      if (currentCount >= capacity) {
        throw new Error('ظرفیت این درس تکمیل شده است');
      }

      // Check if already registered
      const selectionRef = doc(db, 'course_selections', `${studentUid}_${courseId}`);
      const selectionSnap = await transaction.get(selectionRef);
      
      if (selectionSnap.exists() && selectionSnap.data().status === 'active') {
        throw new Error('شما قبلاً این درس را انتخاب کرده‌اید');
      }

      // Add or update student course selection
      transaction.set(selectionRef, {
        courseId,
        studentUid,
        title: courseData.title,
        code: courseData.code,
        credits: courseData.credits,
        professor: courseData.professor,
        day: courseData.day || null,
        startTime: courseData.startTime || null,
        endTime: courseData.endTime || null,
        department: courseData.department || null,
        semester: courseSemester,
        status: 'active',
        createdAt: serverTimestamp()
      });

      // Increment count
      transaction.update(courseRef, {
        enrolledCount: currentCount + 1
      });
    });
  } catch (error) {
    throw error;
  }
};

export const dropCourse = async (selectionId, courseId, semesterId) => {
  if (semesterId && isSemesterPast(semesterId)) {
    throw new Error('امکان حذف درس از ترم‌های گذشته وجود ندارد.');
  }
  try {
    await runTransaction(db, async (transaction) => {
      const selectionRef = doc(db, 'course_selections', selectionId);
      const courseRef = doc(db, 'courses', courseId);
      
      const selectionSnap = await transaction.get(selectionRef);
      if (!selectionSnap.exists()) {
        throw new Error('انتخاب واحد یافت نشد');
      }
      
      const courseSnap = await transaction.get(courseRef);
      
      transaction.update(selectionRef, { status: 'dropped' });
      
      if (courseSnap.exists()) {
        const currentCount = courseSnap.data().enrolledCount || 0;
        transaction.update(courseRef, { enrolledCount: Math.max(0, currentCount - 1) });
      }
    });
  } catch (error) {
    throw error;
  }
};

export const updateUserProfile = async (uid, data, role = 'student') => {
  try {
    const userRef = doc(db, 'users', uid);
    
    // RBAC: Filter allowed fields based on role
    let allowedData = { ...data };
    
    if (role === 'student') {
      const allowedFields = ['email', 'phone', 'address', 'avatar'];
      allowedData = Object.keys(data)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => {
          obj[key] = data[key];
          return obj;
        }, {});
    }
    
    await updateDoc(userRef, allowedData);
  } catch (error) {
    throw error;
  }
};

// --- Reservations ---

export const getReservationSlots = async () => {
  try {
    const q = query(collection(db, 'reservation_slots'), orderBy('date', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  } catch (error) {
    throw error;
  }
};

export const createReservationSlot = async (data) => {
  try {
    await verifyAdminOrStaff();
    const newDocRef = doc(collection(db, 'reservation_slots'));
    await setDoc(newDocRef, {
      ...data,
      reservedCount: 0,
      createdAt: serverTimestamp()
    });
    return newDocRef.id;
  } catch (error) {
    throw error;
  }
};

export const updateReservationSlot = async (id, data) => {
  try {
    await verifyAdminOrStaff();
    await updateDoc(doc(db, 'reservation_slots', id), data);
  } catch (error) {
    throw error;
  }
};

export const deleteReservationSlot = async (id) => {
  try {
    await verifyAdminOrStaff();
    await deleteDoc(doc(db, 'reservation_slots', id));
  } catch (error) {
    throw error;
  }
};

export const getStudentReservations = async (uid) => {
  try {
    const q = query(collection(db, 'student_reservations'), where('studentUid', '==', uid));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  } catch (error) {
    throw error;
  }
};

export const getAllStudentReservations = async () => {
  try {
    await verifyAdminOrStaff();
    const q = query(collection(db, 'student_reservations'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  } catch (error) {
    throw error;
  }
};

export const reserveSlot = async (slotId, studentUid, slotData) => {
  try {
    await runTransaction(db, async (transaction) => {
      const slotRef = doc(db, 'reservation_slots', slotId);
      const slotSnap = await transaction.get(slotRef);
      
      if (!slotSnap.exists()) {
        throw new Error('رزرو مورد نظر یافت نشد');
      }

      const currentCount = slotSnap.data().reservedCount || 0;
      const capacity = slotSnap.data().capacity || 0;
      
      if (currentCount >= capacity) {
        throw new Error('ظرفیت این رزرو تکمیل شده است');
      }
      
      if (slotSnap.data().status !== 'active') {
        throw new Error('این رزرو در حال حاضر فعال نیست');
      }

      // Check if already reserved
      const resRef = doc(db, 'student_reservations', `${studentUid}_${slotId}`);
      const resSnap = await transaction.get(resRef);
      
      if (resSnap.exists() && resSnap.data().status === 'active') {
        throw new Error('شما قبلاً این آیتم را رزرو کرده‌اید');
      }

      // Add or update student reservation
      transaction.set(resRef, {
        slotId,
        studentUid,
        title: slotData.title,
        category: slotData.category,
        date: slotData.date,
        time: slotData.time,
        status: 'active',
        createdAt: serverTimestamp()
      });

      // Increment count
      transaction.update(slotRef, {
        reservedCount: currentCount + 1
      });
    });
  } catch (error) {
    throw error;
  }
};

export const cancelStudentReservation = async (reservationId, slotId) => {
  try {
    await runTransaction(db, async (transaction) => {
      const resRef = doc(db, 'student_reservations', reservationId);
      const slotRef = doc(db, 'reservation_slots', slotId);
      
      const resSnap = await transaction.get(resRef);
      if (!resSnap.exists()) {
        throw new Error('رزرو یافت نشد');
      }
      
      const slotSnap = await transaction.get(slotRef);
      
      transaction.update(resRef, { status: 'cancelled' });
      
      if (slotSnap.exists()) {
        const currentCount = slotSnap.data().reservedCount || 0;
        transaction.update(slotRef, { reservedCount: Math.max(0, currentCount - 1) });
      }
    });
  } catch (error) {
    throw error;
  }
};

// --- Requests ---
export const getStudentRequests = async (uid) => {
  try {
    const q = query(collection(db, 'requests'), where('studentUid', '==', uid));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  } catch (error) {
    throw error;
  }
};

export const getAllRequests = async () => {
  try {
    await verifyAdminOrStaff();
    const q = query(collection(db, 'requests'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  } catch (error) {
    throw error;
  }
};

export const createRequest = async (data) => {
  try {
    const newDocRef = doc(collection(db, 'requests'));
    await setDoc(newDocRef, {
      ...data,
      status: 'در انتظار بررسی',
      createdAt: serverTimestamp()
    });
    return newDocRef.id;
  } catch (error) {
    throw error;
  }
};

export const updateRequestStatus = async (id, status, response) => {
  try {
    await verifyAdminOrStaff();
    const updateData = { status };
    if (response !== undefined) {
      updateData.adminResponse = response;
    }
    await updateDoc(doc(db, 'requests', id), updateData);
  } catch (error) {
    throw error;
  }
};

// --- Support Tickets ---
export const getStudentTickets = async (uid) => {
  try {
    const q = query(collection(db, 'support_tickets'), where('studentUid', '==', uid));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  } catch (error) {
    throw error;
  }
};

export const getAllTickets = async () => {
  try {
    await verifyAdminOrStaff();
    const q = query(collection(db, 'support_tickets'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  } catch (error) {
    throw error;
  }
};

export const createTicket = async (data) => {
  try {
    const newDocRef = doc(collection(db, 'support_tickets'));
    await setDoc(newDocRef, {
      ...data,
      status: 'باز',
      createdAt: serverTimestamp()
    });
    return newDocRef.id;
  } catch (error) {
    throw error;
  }
};

export const updateTicketStatus = async (id, status) => {
  try {
    await verifyAdminOrStaff();
    const allowedStatuses = ['باز', 'در حال بررسی', 'بسته شده'];
    if (!allowedStatuses.includes(status)) {
      throw new Error('وضعیت نامعتبر است');
    }
    await updateDoc(doc(db, 'support_tickets', id), { status });
  } catch (error) {
    throw error;
  }
};


export const getTicketMessages = async (ticketId) => {
  try {
    const q = query(collection(db, 'support_tickets', ticketId, 'messages'), orderBy('createdAt', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    throw error;
  }
};

export const addTicketMessage = async (ticketId, data) => {
  try {
    const messagesRef = collection(db, 'support_tickets', ticketId, 'messages');
    await addDoc(messagesRef, {
      ...data,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    throw error;
  }
};

// --- Admin Stats ---
export const getAdminStats = async () => {
  try {
    await verifyAdminOrStaff();
    
    // We can use getCountFromServer for efficient counting
    const studentsQ = query(collection(db, 'users'), where('role', '==', 'student'));
    const coursesQ = collection(db, 'courses');
    const announcementsQ = collection(db, 'announcements');
    const requestsQ = query(collection(db, 'requests'), where('status', '==', 'در انتظار بررسی'));
    const ticketsQ = query(collection(db, 'support_tickets'), where('status', '==', 'باز'));
    const reservationsQ = query(collection(db, 'reservation_slots'), where('status', '==', 'active'));

    const [studentsSnap, coursesSnap, announcementsSnap, requestsSnap, ticketsSnap, reservationsSnap] = await Promise.all([
      getCountFromServer(studentsQ),
      getCountFromServer(coursesQ),
      getCountFromServer(announcementsQ),
      getCountFromServer(requestsQ),
      getCountFromServer(ticketsQ),
      getCountFromServer(reservationsQ)
    ]);

    return {
      studentsCount: studentsSnap.data().count,
      coursesCount: coursesSnap.data().count,
      announcementsCount: announcementsSnap.data().count,
      pendingRequestsCount: requestsSnap.data().count,
      openTicketsCount: ticketsSnap.data().count,
      activeReservationsCount: reservationsSnap.data().count
    };
  } catch (error) {
    throw error;
  }
};
