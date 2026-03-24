import Header from "./components/Header";
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
  const [sideBar, setSideBar] = useState(false);
  const [data, setData] = useState<SocketData[]>(() => socket.getData());

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
      <Header setSideBar={setSideBar} sideBar={sideBar} />
      <div className="w-screen min-h-16.75 h-[7.5vh] max-h-19 mx-auto px-4 sm:px-6 lg:px-8" />
      <SideBar open={sideBar} />
      <main
        className={`${sideBar ? "xl:w-[80%]" : "w-screen"} h-fit transition-all duration-300 ease-in-out m-0 p-0`}
      >
        <Data data={data} />
      </main>
    </ThemeProvider>
  );
}

export default App;
