import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { TextField, Switch, Button } from "@mui/material";
import socket from "../utils/Socket";

export default function SideBar({ open }: { open: boolean }) {
  const [manual, setManual] = useState<boolean>(true);
  const [button, setButton] = useState<boolean>(true);
  const [textValue, setTextValue] = useState<string>("10");
  const [frequency, setFrequency] = useState<number>(10);
  const [response, setResponse] = useState<string[]>([]);
  const requestInFlightRef = useRef<boolean>(false);
  const cooldownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setManualCooldown = () => {
    setButton(false);

    if (cooldownTimeoutRef.current) {
      clearTimeout(cooldownTimeoutRef.current);
    }

    cooldownTimeoutRef.current = setTimeout(() => {
      setButton(true);
      cooldownTimeoutRef.current = null;
    }, 5000);
  };

  const getResponse = async () => {
    if (requestInFlightRef.current) {
      return;
    }

    requestInFlightRef.current = true;

    try {
      const response = await fetch("http://localhost:8000/racegpt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: socket.getData() }),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const result = await response.json();
      setResponse((prev) => [...prev, result.verdict]);
      console.log("Success:", result);
    } catch (error) {
      setResponse((prev) => [...prev, "Error: RaceGPT failed to respond"]);
      console.error("Error:", error);
    } finally {
      requestInFlightRef.current = false;
    }
  };

  const handleClick = async () => {
    setManualCooldown();
    await getResponse();
  };

  const handleToggle = () => {
    setManual((prev) => !prev);
  };

  useEffect(() => {
    if (manual) {
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const runLoop = async () => {
      if (cancelled) {
        return;
      }

      await getResponse();

      if (cancelled) {
        return;
      }

      timeoutId = setTimeout(() => {
        void runLoop();
      }, frequency * 1000);
    };

    void runLoop();

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [manual, frequency]);

  useEffect(() => {
    return () => {
      if (cooldownTimeoutRef.current) {
        clearTimeout(cooldownTimeoutRef.current);
      }
    };
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value;
    const lastChar = text.slice(-1);
    if (lastChar && !/^\d$/.test(lastChar)) {
      return; // Ignore non-numeric input
    }
    const value = parseInt(text, 10);
    if (!isNaN(value) && value >= 5) {
      setFrequency(value);
    }
    setTextValue(text);
  };

  return (
    <div
      className={`min-w-64 w-[20%] gap-3 h-full m-0 bg-[#232526] text-gray-200 p-6 pt-12 fixed top-0 ${open ? "right-0" : "right-[min(-20%,calc(var(--spacing)*(-72)))]"} z-99 transition-all duration-300 ease-in-out shadow-[-10px_0px_15px_-3px_rgba(0,0,0,0.1)] flex flex-col items-center justify-between`}
    >
      <div className="flex justify-between flex-col w-full gap-3">
        <h2 className="text-center mt-[5vh] text-lg font-semibold uppercase tracking-[0.26em] text-white/78">
          RaceGPT Copilot
        </h2>
        <SideBarTile className="flex flex-row items-center gap-2 justify-center text-[0.75em] 2xl:text-lg">
          <p>M A N U A L</p>
          <Switch checked={!manual} onChange={handleToggle} />
          <p>A U T O</p>
        </SideBarTile>
      </div>
      <SideBarTile className="h-full flex flex-col-reverse overflow-y-scroll justify-start">
        {response.length == 0 ? (
          <div className="h-full w-full flex justify-center items-center">
            <h3 className="text-white/55">Nothing to see here</h3>
          </div>
        ) : (
          <ol className="space-y-2 pl-0 counter-reset-item">
            {response.map((res, i) => {
              return (
                <li
                  key={i}
                  className={`flex border border-white/8 bg-black/18 px-3 py-2.5 text-left text-wrap rounded-md ${res.split(" ")[0] === "Error:" ? "text-[#c41e3a]" : "text-slate-100"}`}
                >
                  <span className="block h-full mr-2 font-black">
                    {i + 1}.{" "}
                  </span>
                  {res}
                </li>
              );
            })}
          </ol>
        )}
      </SideBarTile>
      {manual ? (
        <Button
          onClick={handleClick}
          variant="contained"
          sx={{
            width: "100%",
            boxShadow: "0px 18px 40px rgba(0,0,0,0.24)",
            "&:focus": {
              outline: "none", // Removes the default outline on focus
            },
            // For standard Material UI buttons, you might need to target the internal state class
            "&.Mui-focusVisible": {
              outline: "none",
            },
          }}
          disabled={!button}
        >
          {button ? "Request Response" : "Please Wait"}
        </Button>
      ) : (
        <TextField
          id="outlined-basic"
          label="Frequency (s)"
          variant="outlined"
          value={textValue}
          onChange={handleChange}
          sx={{
            width: "100%",
            input: {
              color: "#eeeeee",
            },
            // Change label color
            "& .MuiInputLabel-root": {
              color: "#ccc", // Default label color
            },
            "& .MuiInputLabel-root.Mui-focused": {
              color: "#1976d2", // Focused label color
            },

            // Change border color
            "& .MuiOutlinedInput-root": {
              "& fieldset": {
                borderColor: "#cccccc", // Default border color
              },
              "&:hover fieldset": {
                borderColor: "#ffffff", // Hover border color
              },
              "&.Mui-focused fieldset": {
                borderColor: "#ffffff", // Focused border color
              },
            },
          }}
        />
      )}
    </div>
  );
}

function SideBarTile({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex w-full flex-col overflow-hidden rounded-[1.25rem] border border-white/8 bg-[linear-gradient(180deg,#242424,#252525)] p-3 shadow-[0_18px_40px_rgba(0,0,0,0.24)] ${className}`}
    >
      {children}
    </section>
  );
}
