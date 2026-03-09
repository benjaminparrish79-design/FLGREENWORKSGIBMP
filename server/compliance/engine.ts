export function checkCompliance(data: {
  rainForecast: number;
  waterDistance: number;
  nitrogenApplied: number;
  maxNitrogenAllowed: number;
  blackoutSeason: boolean;
}) {
  if (data.rainForecast > 0.5) {
    return {
      status: "danger",
      message: "Heavy rain forecast. Application not recommended.",
    };
  }

  if (data.waterDistance < 10) {
    return {
      status: "warning",
      message: "Too close to water body buffer zone.",
    };
  }

  if (data.nitrogenApplied > data.maxNitrogenAllowed) {
    return {
      status: "danger",
      message: "Nitrogen exceeds yearly limit.",
    };
  }

  if (data.blackoutSeason) {
    return {
      status: "danger",
      message: "Application during blackout season is prohibited.",
    };
  }

  return {
    status: "safe",
    message: "Application appears compliant.",
  };
}
