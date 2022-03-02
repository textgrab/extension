import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { Card, CardBody, CardImg, CardText, CardTitle, Row } from "reactstrap";

import { loadUserPrefs } from "./services/preferences";
import Frame1 from "./assets/img/onboarding1.svg";
import Frame2 from "./assets/img/onboarding2.svg";
import Frame3 from "./assets/img/onboarding3.svg";

import "bootstrap/dist/css/bootstrap.css";
import "./assets/scss/onboarding.scss";

const OnboardingFrame = ({
  title,
  description,
  image,
  index,
}: {
  title: string;
  description: string;
  image: any;
  index: number;
}) => {
  return (
    <div className="col-lg-4 mb-3 d-flex align-items-stretch justify-content-center">
      <Card
        className="card onboarding-card border-0"
        id={`onboarding-card-${index}`}
      >
        <CardImg src={image} className="card-img-top" />
        <CardBody className="card-body d-flex flex-column">
          <CardTitle className="card-title m-md-2">{title}</CardTitle>
          <CardText className="card-text p-2">{description}</CardText>
        </CardBody>
      </Card>
    </div>
  );
};

const slideData = [
  {
    title: "1. Activate the TextGrab Extension",
    description: `There are two ways you can activate the extension: Opening the
    extension dialog by clicking the TextGrab icon and pressing
    "Capture Text" or you can use the shortcut Option-C on Mac OS /
    Alt-C on Windows.`,
    image: Frame1,
  },
  {
    title: "2. Find your image/video",
    description: `To be able to copy text, you will need to click on your
    video/image. In most cases, you should see a dashed blue border
    around the video/image frame.`,
    image: Frame2,
  },
  {
    title: "3. Copy your text",
    description: `The text that was visible when you clicked the video/image is
    now selectable. Simply use your cursor to select and copy the
    text just as you would with any webpage!`,
    image: Frame3,
  },
];

const OnboardingPage = () => {
  const [analyticsChecked, setAnalyticsChecked] = useState(false);

  useEffect(() => {
    loadUserPrefs().then((prefs) => {
      setAnalyticsChecked(prefs.analyticsOptIn);
    });
  }, []);
  return (
    <div className="container onboarding-cards mt-4">
      <h1 className="centered mt-3 mb-4" id="onboarding-title">
        Thank You for Downloading TextGrab!
      </h1>
      <Row className="mt-0">
        {slideData.map((slide, index) => (
          <OnboardingFrame
            title={slide.title}
            description={slide.description}
            image={slide.image}
            index={index}
          />
        ))}
      </Row>
      <div className="send-analytics-pref">
        <input
          type="checkbox"
          value=""
          id="send-anonymous-check"
          checked={analyticsChecked}
          onClick={(e) => {
            let newVal = (e.target as HTMLInputElement).checked;
            chrome.storage.sync.set({ analyticsOptIn: newVal });
          }}
        />
        <label className="form-check-label" htmlFor="send-anonymous-check">
          Send Anonymous Analytics Data to Improve TextGrab
        </label>
      </div>
    </div>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <OnboardingPage />
  </React.StrictMode>,
  document.getElementById("root")
);
