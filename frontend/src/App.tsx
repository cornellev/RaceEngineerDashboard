import Header from "./components/Header";
import Home from "./pages/Home";
import Data from "./pages/Data";
import RaceGPT from "./pages/RaceGPT";
import SideBar from "./components/SideBar";
import Chart from "./components/Chart";

import socket from "./utils/Socket";

import { useState, useEffect } from "react";

function App() {
  const [page, setPage] = useState("dummy");
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
        return (
          <>
            <p className="text-white">JSON: {messages}</p>
            <Chart />
          </>
        );
    }
  };
  useEffect(() => {
    socket.connect();

    const unsubscribe = socket.subscribe((data) => {
      console.log("Received data from backend:", JSON.stringify(data));
      setMessages(JSON.stringify(data));
    });

    return () => unsubscribe();
  }, []);

  return (
    <>
      <Header setPage={setPage} setSideBar={setSideBar} sideBar={sideBar} />
      <div className="w-full h-[10vh] mx-auto px-4 sm:px-6 lg:px-8" />
      <SideBar open={sideBar} />
      <main
        className={`${sideBar ? "w-[80%]" : "w-full"} h-full transition-all duration-300 ease-in-out ml-0`}
      >
        {getPageComponent()}
      </main>
    </>
  );
}

export default App;
