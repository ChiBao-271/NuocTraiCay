import { AuthProvider } from '../contexts/AuthContext.jsx';
import '../styles.css';

export const metadata = {
  title: 'FreshFruit Shop',
  description: 'Cửa hàng trực tuyến nước ép trái cây và trái cây tươi',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

