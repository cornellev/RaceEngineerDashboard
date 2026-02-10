import Header from "./components/Header";
import Home from "./pages/Home";
import Data from "./pages/Data";
import RaceGPT from "./pages/RaceGPT";
import SideBar from "./components/SideBar";

import socket from "./utils/Socket";

import { useState, useEffect } from "react";

function App() {
  const [page, setPage] = useState("home");
  const [sideBar, setSideBar] = useState(false);
  const [messages, setMessages] = useState("");

  const getPageComponent = () => {
    switch (page) {
      case "home":
        return <Home />;
      case "data":
        return <Data />;
      case "racegpt":
        return <RaceGPT />;
      default:
        return <Home />;
    }
  };

  useEffect(() => {
    socket.connect();

    // 2. Subscribe to incoming messages
    const unsubscribe = socket.subscribe((data) => {
      setMessages((prev) => prev + "\n" + data.text);
    });

    // 3. Cleanup on unmount
    return () => unsubscribe();
  }, []);

  return (
    <>
      <Header setPage={setPage} setSideBar={setSideBar} sideBar={sideBar} />
      <SideBar open={sideBar} />
      {/*{getPageComponent()}*/}
      <p>{messages}</p>
    </>
  );
}

export default App;
