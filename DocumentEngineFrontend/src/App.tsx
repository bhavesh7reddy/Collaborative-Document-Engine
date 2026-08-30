import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DocumentEditor from './components/DocumentEditor';
import ProtectedRoute from './components/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LoginPage />,
  },
  {
    path: '/signup',
    element: <SignupPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/home',
        element: <HomePage />,
      },
      {
        path: '/doc/:docId',
        element: <DocumentEditor />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}