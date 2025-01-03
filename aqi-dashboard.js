async function loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  
  class AQIDashboard extends HTMLElement {
    async connectedCallback() {
      if (!window.Chart) {
        await loadScript('https://cdn.jsdelivr.net/npm/chart.js');
      }
    }
  
    getUAQIColor(aqi) {
      if (aqi >= 80) return '#009E3A'; // Excellent - Green
      if (aqi >= 60) return '#84CF33'; // Good - Light Green
      if (aqi >= 40) return '#FFFF00'; // Moderate - Yellow
      if (aqi >= 20) return '#FF8C00'; // Poor - Orange
      if (aqi > 0) return '#FF0000';   // Bad - Red
      return '#800000';                // Bad - Dark Red
    }
  
    getUAQICategory(aqi) {
      if (aqi >= 80) return 'Ausgezeichnete Luftqualität';
      if (aqi >= 60) return 'Gute Luftqualität';
      if (aqi >= 40) return 'Mittelmäßige Luftqualität';
      if (aqi >= 20) return 'Niedrige Luftqualität';
      if (aqi > 0) return 'Schlechte Luftqualität';
      return 'Schlechte Luftqualität';
    }
  
    setConfig(config) {
      if (!config.entity) throw new Error('Please define an entity');
      this.config = config;
    }
  
    set hass(hass) {
      if (!this.content) {
        this.innerHTML = `
          <ha-card>
            <style>
              .status-bar {
                padding: 0.5rem 1rem;
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-size: 0.9rem;
                border-bottom: 1px solid var(--divider-color);
              }
              .status-indicator {
                display: flex;
                align-items: center;
                gap: 0.5rem;
              }
              .status-dot {
                width: 10px;
                height: 10px;
                border-radius: 50%;
              }
              .grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
                gap: 0.5rem;
                padding: 0.5rem;
              }
              .card {
                background: var(--card-background-color);
                padding: 0.5rem;
                border-radius: 4px;
                text-align: center;
              }
              .value {
                font-size: 1.2rem;
                font-weight: bold;
              }
              .label {
                font-size: 0.8rem;
                color: var(--secondary-text-color);
              }
              .unit {
                font-size: 0.7rem;
                color: var(--secondary-text-color);
              }
              .chart-container {
                height: 250px;
                padding: 0.5rem;
                margin-top: 0.5rem;
              }
              .dominant {
                font-size: 0.8rem;
                color: var(--secondary-text-color);
              }
              ha-card {
                padding: 0.5rem;
              }
            </style>
            
            <div class="status-bar">
              <div class="status-indicator">
                <div class="status-dot" id="status-dot"></div>
                <span id="status-text"></span>
              </div>
              <div class="dominant" id="dominant-text"></div>
            </div>
  
            <div class="grid">
              <div class="card">
                <div class="label">UAQI</div>
                <div class="value" id="aqi"></div>
              </div>
              <div class="card">
                <div class="label">CO</div>
                <div class="value" id="co"></div>
                <div class="unit">ppb</div>
              </div>
              <div class="card">
                <div class="label">NO₂</div>
                <div class="value" id="no2"></div>
                <div class="unit">ppb</div>
              </div>
              <div class="card">
                <div class="label">O₃</div>
                <div class="value" id="o3"></div>
                <div class="unit">ppb</div>
              </div>
              <div class="card">
                <div class="label">PM10</div>
                <div class="value" id="pm10"></div>
                <div class="unit">µg/m³</div>
              </div>
              <div class="card">
                <div class="label">PM2.5</div>
                <div class="value" id="pm25"></div>
                <div class="unit">µg/m³</div>
              </div>
            </div>
            
            <div class="chart-container">
              <canvas id="forecastChart"></canvas>
            </div>
          </ha-card>
        `;
        this.content = true;
        this.chart = null;
      }
  
      const sensor = hass.states[this.config.entity];
      if (sensor) {
        // Update status bar
        const aqi = sensor.attributes.index_uaqi.aqi;
        const color = this.getUAQIColor(aqi);
        
        this.querySelector('#status-dot').style.backgroundColor = color;
        this.querySelector('#status-text').textContent = this.getUAQICategory(aqi);
        this.querySelector('#dominant-text').textContent = 
          `Dominant: ${sensor.attributes.index_uaqi.dominant_pollutant.toUpperCase()}`;
  
        // Update values
        this.querySelector('#aqi').textContent = aqi;
        this.querySelector('#co').textContent = sensor.attributes.co.value.toFixed(1);
        this.querySelector('#no2').textContent = sensor.attributes.no2.value.toFixed(1);
        this.querySelector('#o3').textContent = sensor.attributes.o3.value.toFixed(1);
        this.querySelector('#pm10').textContent = sensor.attributes.pm10.value.toFixed(1);
        this.querySelector('#pm25').textContent = sensor.attributes.pm25.value.toFixed(1);
  
        if (window.Chart) {
          // Update chart with UAQI colors
          const forecast = sensor.attributes.forecast;
          this.updateChart(forecast, color);
        }
      }
    }
  
    updateChart(forecast, currentColor) {
      const ctx = this.querySelector('#forecastChart');
      
      if (JSON.stringify(forecast) === this.lastForecast) {
        return;
      }
      this.lastForecast = JSON.stringify(forecast);
  
      const labels = forecast.map(f => {
        const date = new Date(f.datetime);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      });
      const data = forecast.map(f => f.aqi);
      const pollutants = forecast.map(f => f.dominant_pollutant);
  
      if (!this.chart) {
        this.chart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{
              label: 'UAQI Forecast',
              data: data,
              borderColor: currentColor,
              tension: 0.1,
              fill: false
            }]
          },
          options: {
            animation: false,
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              tooltip: {
                callbacks: {
                  afterLabel: (context) => {
                    const aqi = context.raw;
                    return [
                      `Dominant: ${pollutants[context.dataIndex].toUpperCase()}`,
                      `Status: ${this.getUAQICategory(aqi)}`
                    ];
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: false,
                title: {
                  display: true,
                  text: 'UAQI'
                }
              },
              x: {
                title: {
                  display: true,
                  text: 'Time'
                }
              }
            }
          }
        });
      } else {
        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = data;
        this.chart.data.datasets[0].borderColor = currentColor;
        this.chart.update('none');
      }
    }
  
    getCardSize() {
      return 6;
    }
  }
  
  customElements.define('aqi-dashboard', AQIDashboard);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: 'aqi-dashboard',
    name: 'Google AQI Card',  
    description: 'A custom card to display Air Quality Index and pollutant levels with forecast visualization.',
  });
  