import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop.jsx';
import NotificationProvider from './components/NotificationProvider.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import SignIn from './pages/SignIn.jsx';
import SignUp from './pages/SignUp.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import ForgotPin from './pages/ForgotPin.jsx';
import MovieDetail from './pages/MovieDetail.jsx';
import Schedule from './pages/Schedule.jsx';
import Cinemas from './pages/Cinemas.jsx';
import CinemaDetail from './pages/CinemaDetail.jsx';
import BookingHistory from './pages/BookingHistory.jsx';
import Orders from './pages/Orders.jsx';
import Profile from './pages/Profile.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import ManagerDashboard from './pages/ManagerDashboard.jsx';
import Events from './pages/Events.jsx';
import Library from './pages/Library.jsx';
import FoodAndDrinks from './pages/FoodAndDrinks.jsx';
import FoodAndDrinksWithTicket from './pages/FoodAndDrinksWithTicket.jsx';
import Checkout from './pages/Checkout.jsx';
import BookTicket from './pages/BookTicket.jsx';
import PaymentSuccess from './pages/PaymentSuccess.jsx';
import SearchResults from './pages/SearchResults.jsx';
import TransactionHistory from './pages/TransactionHistory.jsx';

export default function App() {
  return (
    <NotificationProvider>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/login" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/register" element={<SignUp />} />
        <Route path="/forgot" element={<ForgotPassword />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/forgot-pin" element={<ForgotPin />} />
        <Route path="/reset" element={<ResetPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/movie/:id" element={<MovieDetail />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/cinemas" element={<Cinemas />} />
        <Route path="/cinema/:name" element={<CinemaDetail />} />
        {/* Customer routes - chỉ CUSTOMER mới có thể truy cập */}
        <Route path="/booking-history" element={
          <ProtectedRoute allowedRoles="CUSTOMER">
            <BookingHistory />
          </ProtectedRoute>
        } />
        <Route path="/orders" element={
          <ProtectedRoute allowedRoles="CUSTOMER">
            <Orders />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute allowedRoles="CUSTOMER">
            <Profile />
          </ProtectedRoute>
        } />
        <Route path="/library" element={
          <ProtectedRoute allowedRoles="CUSTOMER">
            <Library />
          </ProtectedRoute>
        } />
        <Route path="/food-drinks" element={<FoodAndDrinks />} />
        <Route path="/food-and-drinks" element={<FoodAndDrinks />} />
        <Route path="/order-food" element={<FoodAndDrinks />} />
        <Route path="/food-drinks-with-ticket" element={
          <ProtectedRoute allowedRoles="CUSTOMER">
            <FoodAndDrinksWithTicket />
          </ProtectedRoute>
        } />
        <Route path="/checkout" element={
          <ProtectedRoute allowedRoles="CUSTOMER">
            <Checkout />
          </ProtectedRoute>
        } />
        <Route path="/booking" element={
          <ProtectedRoute allowedRoles="CUSTOMER">
            <BookTicket />
          </ProtectedRoute>
        } />
        <Route path="/book-ticket" element={
          <ProtectedRoute allowedRoles="CUSTOMER">
            <BookTicket />
          </ProtectedRoute>
        } />
        <Route path="/wallet" element={
          <ProtectedRoute allowedRoles="CUSTOMER">
            <Navigate to="/profile?tab=wallet" replace />
          </ProtectedRoute>
        } />
        <Route path="/transaction-history" element={
          <ProtectedRoute allowedRoles="CUSTOMER">
            <TransactionHistory />
          </ProtectedRoute>
        } />

        {/* Payment success/return routes - dùng chung cho tất cả payment methods */}
        <Route path="/payment/success" element={<PaymentSuccess />} />

        {/* Public routes - Events có thể xem nhưng một số chức năng cần đăng nhập */}
        <Route path="/events" element={<Events />} />

        {/* Admin routes - chỉ ADMIN mới có thể truy cập */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles="ADMIN">
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/*" element={
          <ProtectedRoute allowedRoles="ADMIN">
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admindashboard" element={
          <ProtectedRoute allowedRoles="ADMIN">
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin-dashboard" element={
          <ProtectedRoute allowedRoles="ADMIN">
            <AdminDashboard />
          </ProtectedRoute>
        } />

        {/* Manager routes - chỉ MANAGER mới có thể truy cập */}
        <Route path="/manager" element={
          <ProtectedRoute allowedRoles="MANAGER">
            <ManagerDashboard />
          </ProtectedRoute>
        } />
        <Route path="/manager/*" element={
          <ProtectedRoute allowedRoles="MANAGER">
            <ManagerDashboard />
          </ProtectedRoute>
        } />
        <Route path="/managerdashboard" element={
          <ProtectedRoute allowedRoles="MANAGER">
            <ManagerDashboard />
          </ProtectedRoute>
        } />
        <Route path="/manager-dashboard" element={
          <ProtectedRoute allowedRoles="MANAGER">
            <ManagerDashboard />
          </ProtectedRoute>
        } />
      </Routes>
    </NotificationProvider>
  );
}
