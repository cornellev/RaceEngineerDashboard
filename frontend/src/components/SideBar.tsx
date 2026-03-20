import { useEffect, useRef, useState } from "react";
import { TextField, Switch, Button } from "@mui/material";
import socket from "../utils/Socket";

export default function SideBar({ open }: { open: boolean }) {
  const [manual, setManual] = useState(true);
  const [button, setButton] = useState(true);
  const [textValue, setTextValue] = useState("10");
  const [frequency, setFrequency] = useState(10);
  const [response, setResponse] = useState<string[]>([]);
  const requestInFlightRef = useRef(false);
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
      setResponse((prev) => [...prev, `${prev.length + 1}. ${result.verdict}`]);
      console.log("Success:", result);
    } catch (error) {
      setResponse((prev) => [
        ...prev,
        `${prev.length + 1}. Error: RaceGPT failed to respond`,
      ]);
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
      className={`min-w-64 w-[20%] h-full m-0 bg-[#232526] text-gray-200 p-6 pt-12 fixed top-0 ${open ? "right-0" : "right-[min(-20%,calc(var(--spacing)*(-72)))]"} z-99 transition-all duration-300 ease-in-out shadow-[-10px_0px_15px_-3px_rgba(0,0,0,0.1)] flex flex-col items-center justify-between`}
    >
      <div className="flex justify-center flex-col">
        <h2 className="text-lg text-center font-bold mt-[25%]">
          RaceGPT Copilot
        </h2>
        <div className="flex items-center gap-2 mt-4">
          <p>Manual</p>
          <Switch checked={!manual} onChange={handleToggle} />
          <p>Auto</p>
        </div>
      </div>
      <div className="h-full w-full">
        {response.length == 0
          ? "Nothing to see here"
          : response.map((res) => {
              return <p className="text-wrap">{res}</p>;
            })}
      </div>
      {manual ? (
        button ? (
          <Button
            onClick={handleClick}
            variant="contained"
            sx={{
              "&:focus": {
                outline: "none", // Removes the default outline on focus
              },
              // For standard Material UI buttons, you might need to target the internal state class
              "&.Mui-focusVisible": {
                outline: "none",
              },
            }}
          >
            Request Response
          </Button>
        ) : (
          <p className="text-center font-bold">Please wait...</p>
        )
      ) : (
        <TextField
          id="outlined-basic"
          label="Frequency (s)"
          variant="outlined"
          value={textValue}
          onChange={handleChange}
          sx={{
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
