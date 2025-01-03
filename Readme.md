# Google AQI Card for Home Assistant

A custom card to display Air Quality Index (AQI) and pollutant levels in Home Assistant, with forecast visualization.

## Features
- Displays real-time AQI data and pollutant levels.
- Forecast chart with dominant pollutants.
- Color-coded AQI categories.

## Installation
1. Download the `aqi-dashboard.js` file or clone this repository.
2. Place the file in your Home Assistant's `www` directory.
3. Add the following resource to your Home Assistant configuration:
   ```yaml
   lovelace:
     resources:
       - url: /local/aqi-dashboard.js
         type: module
4. Restart Home Assistant or refresh your browser cache.

## Usage
Add the following YAML to your dashboard: 
```yaml
    type: custom:aqi-dashboard
    entity: sensor.google_aqi_sensor

    
