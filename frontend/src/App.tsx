import Header from "./components/Header";
import Home from "./pages/Home";
import Data from "./pages/Data";
import SideBar from "./components/SideBar";

import socket from "./utils/Socket";
import type { SocketData } from "./utils/Socket";

import { useState, useEffect } from "react";

import { createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#242424",
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          "&.MuiChartsTooltip-paper": {
            backgroundColor: "#1e1e1e",
            borderRadius: "8px",
            border: "1px solid #555",
            backgroundImage: "none",
          },
        },
      },
    },
  },
});

function App() {
  const [page, setPage] = useState("data");
  const [sideBar, setSideBar] = useState(false);
  const [data, setData] = useState<SocketData[]>(() => socket.getData());

  const getPageComponent = () => {
    switch (page) {
      case "home":
        return <Home />;
      case "data":
        return <Data data={data} />;
      case "racegpt":
        return <Data data={data} />;
      default:
        return <Data data={data} />;
    }
  };

  useEffect(() => {
    socket.connect();

    const unsubscribe = socket.subscribe(() => {
      setData([...socket.getData()]);
    });

    return () => unsubscribe();
  }, []);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Header setPage={setPage} setSideBar={setSideBar} sideBar={sideBar} />
      <div className="w-screen h-[max(7.5vh,67px)] mx-auto px-4 sm:px-6 lg:px-8" />
      <SideBar open={sideBar} />
      <main
        className={`${sideBar ? "xl:w-[80%]" : "w-screen"} h-fit transition-all duration-300 ease-in-out m-0 p-0`}
      >
        {getPageComponent()}
      </main>
    </ThemeProvider>
  );
}

export default App;
