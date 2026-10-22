import { AdminShell } from '../../components/admin/AdminShell.jsx';

export const metadata = {
  title: 'Admin | FreshFruit Shop',
  description: 'Trang quản trị FreshFruit Shop',
};

export default function AdminLayout({ children }) {
  return <AdminShell>{children}</AdminShell>;
}
