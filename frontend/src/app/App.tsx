import { AppRouter } from "../routes/AppRouter";
import { NavBar } from "../components/NavBar";
import { AuthProvider } from "../store/auth-context";
import { BrowserRouter } from "react-router-dom";

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-shell">
          <NavBar />
          <main>
            <AppRouter />
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
