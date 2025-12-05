import { useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";

const LoadTestButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [intensity, setIntensity] = useState(50);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const memoryLoadMb = intensity * 5;
  const cpuIterations = intensity * 500_000;

  const toggleModal = () => {
    if (isSubmitting) {
      return;
    }
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
    } catch (error) {
      setStatusMessage(
        error.response?.data?.message || "Unable to start the load test.",
      );
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
              <div className="load-test-status">{statusMessage}</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
};

export default LoadTestButton;
