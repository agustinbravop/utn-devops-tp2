import { useState, useRef, useEffect } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";
const TOTAL_DURATION_SECONDS = 60;

const LoadTestButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [intensity, setIntensity] = useState(50);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(null);

  const timerRef = useRef(null);

  const memoryLoadMb = intensity * 5;
  const cpuIterations = intensity * 500_000;

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    if (secondsLeft === null) {
      clearTimer();
      return;
    }

    if (secondsLeft === 0) {
      clearTimer();
      return;
    }

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === null) {
          return prev;
        }
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimer();
    };
  }, [secondsLeft]);

  const toggleModal = () => {
    if (isSubmitting) {
      return;
    }
    clearTimer();
    setSecondsLeft(null);
    setStatusMessage("");
    setIsOpen((prev) => !prev);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setStatusMessage("Starting load test...");

    try {
      await axios.post(`${API_URL}/load-test`, { intensity });
      setStatusMessage("Load test running for 60 seconds.");
      setSecondsLeft(TOTAL_DURATION_SECONDS);
    } catch (error) {
      setStatusMessage(
        error.response?.data?.message || "Unable to start the load test.",
      );
      setSecondsLeft(null);
      clearTimer();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="btn btn-primary load-test-fab"
        onClick={toggleModal}
        disabled={isSubmitting}
      >
        Run Load Test
      </button>

      {isOpen ? (
        <div className="load-test-overlay" onClick={toggleModal}>
          <div
            className="load-test-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="load-test-title">Run Load Test</h2>
            <p className="load-test-description">
              Launch a 60-second CPU and memory stress test on one backend
              instance.
            </p>

            <form className="load-test-form" onSubmit={handleSubmit}>
              <label className="load-test-label" htmlFor="load-intensity">
                Intensity <span>{intensity}</span>
              </label>
              <input
                id="load-intensity"
                type="range"
                min="1"
                max="100"
                value={intensity}
                onChange={(event) => setIntensity(Number(event.target.value))}
                disabled={isSubmitting}
              />
              <p className="load-test-helper">
                Intensity: defines the strain: memory = {memoryLoadMb} MB and
                CPU loop = {cpuIterations.toLocaleString()} iterations per
                cycle.
              </p>

              <div className="load-test-actions">
                <button
                  type="button"
                  className="btn load-test-close"
                  onClick={toggleModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary load-test-start"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Starting..." : "Start 60s Load"}
                </button>
              </div>
            </form>

            {statusMessage ? (
              <div className="load-test-status">
                <span>{statusMessage}</span>
                {secondsLeft !== null ? (
                  <>
                    <span className="load-test-countdown">{secondsLeft}s</span>
                    <div className="load-test-progress">
                      <div
                        className="load-test-progress-bar"
                        style={{
                          width: `${((TOTAL_DURATION_SECONDS - secondsLeft) / TOTAL_DURATION_SECONDS) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
};

export default LoadTestButton;
