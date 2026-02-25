import Header from "./components/Header";
import Home from "./pages/Home";
import Data from "./pages/Data";
import RaceGPT from "./pages/RaceGPT";
import SideBar from "./components/SideBar";
import Chart from "./components/Chart";

import socket from "./utils/Socket";

import { useState, useEffect } from "react";

function App() {
  const [page, setPage] = useState("home");
  const [sideBar, setSideBar] = useState(false);
  const [messages, setMessages] = useState("");
  /*
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
*/
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
      <SideBar open={sideBar} />
      {/*getPageComponent()*/}
      {<p className="text-white">JSON: {messages}</p>}
      <Chart />
    </>
  );
}

export default App;
