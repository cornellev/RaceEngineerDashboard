import Header from "./components/Header";
import Home from "./pages/Home";
import Data from "./pages/Data";

import { useState } from "react";

function App() {
  const [page, setPage] = useState("home");

  return (
    <>
      <Header setPage={setPage} />
      {page === "home" ? <Home /> : <Data />}
    </>
  );
}

export default App;
