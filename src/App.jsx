import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SummaryPage from "./components/SummaryPage";
import CompletePage from "./components/CompletePage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/user/user01" />} />
        <Route path="/user/:userId" element={<SummaryPage />} />
        <Route path="/complete" element={<CompletePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
