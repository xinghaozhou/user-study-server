import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SummaryPage from "./components/SummaryPage";
import Page2 from "./pages/Page2";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/user/user01" />} />
        <Route path="/user/:userId" element={<SummaryPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
