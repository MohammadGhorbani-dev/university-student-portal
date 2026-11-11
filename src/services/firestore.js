import { createRegistrationService, courseDeadline, slotDeadline } from './registration';
import { collection, getDocs, doc, updateDoc, query, orderBy, setDoc, deleteDoc, runTransaction, where, serverTimestamp, getDoc, getCountFromServer, addDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';

const registrations = () => createRegistrationService(db, () => auth.currentUser?.uid);
export const registerCourse = (id, uid) => registrations().registerCourse(id, uid);
export const dropCourse = (id, courseId) => registrations().dropCourse(id, courseId);
export const reserveSlot = (id, uid) => registrations().reserveSlot(id, uid);
export const cancelStudentReservation = (id, slotId) => registrations().cancelStudentReservation(id, slotId);

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
      registrationEndsAt: courseDeadline(data.semester),
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
    await updateDoc(doc(db, 'courses', id), { ...data, ...(data.semester ? { registrationEndsAt: courseDeadline(data.semester) } : {}) });
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



export const updateUserProfile = async (uid, data, role = 'student') => {
  try {
    const userRef = doc(db, 'users', uid);
    
    // RBAC: Filter allowed fields based on role
    let allowedData = { ...data };
    
    if (role === 'student' || role === 'admin' || role === 'staff') {
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
      bookingEndsAt: slotDeadline(data.date, data.time),
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
    const ref = doc(db, 'reservation_slots', id);
    const existing = await getDoc(ref);
    if (!existing.exists()) throw new Error('امکان رزرو یافت نشد.');
    const merged = { ...existing.data(), ...data };
    const scheduleChanged = merged.date !== existing.data().date || merged.time !== existing.data().time;
    const bookingEndsAt = scheduleChanged || !existing.data().bookingEndsAt
      ? slotDeadline(merged.date, merged.time) : existing.data().bookingEndsAt;
    await updateDoc(ref, { ...data, bookingEndsAt });
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
