/**
 * PTZ Camera Card
 * A Home Assistant Lovelace card with camera display and pan-tilt joystick
 */

const LitElement = Object.getPrototypeOf(
    customElements.get("ha-panel-lovelace")
);
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

const CARD_VERSION = "1.0.0";

console.info(
    `%c PTZ-CAMERA-CARD %c ${CARD_VERSION} `,
    "color: white; background: #3498db; font-weight: bold;",
    "color: #3498db; background: white; font-weight: bold;"
);

class PTZCameraCard extends LitElement {
    static get properties() {
        return {
            hass: { type: Object },
            config: { type: Object },
            _joystickActive: { type: Boolean },
            _joystickX: { type: Number },
            _joystickY: { type: Number },
        };
    }

    constructor() {
        super();
        this._joystickActive = false;
        this._joystickX = 0;
        this._joystickY = 0;
        this._lastDirection = null;
        this._moveInterval = null;
    }

    static getConfigElement() {
        return document.createElement("ptz-camera-card-editor");
    }

    static getStubConfig() {
        return {
            camera_entity: "",
            title: "PTZ Camera",
        };
    }

    setConfig(config) {
        if (!config.camera_entity) {
            throw new Error("You must specify a camera_entity");
        }
        this.config = {
            title: "",
            service: "onvif.ptz",
            service_data: {},
            joystick_size: 120,
            move_speed: 0.5,
            ...config,
        };
    }

    getCardSize() {
        return 5;
    }

    static get styles() {
        return css`
      :host {
        display: block;
      }

      .card-container {
        position: relative;
        overflow: hidden;
        border-radius: var(--ha-card-border-radius, 12px);
        background: var(--ha-card-background, var(--card-background-color, white));
        box-shadow: var(--ha-card-box-shadow, none);
      }

      .card-header {
        padding: 12px 16px;
        font-size: 1.1em;
        font-weight: 500;
        color: var(--primary-text-color);
      }

      .camera-container {
        position: relative;
        width: 100%;
        min-height: 200px;
        background: #000;
      }

      .camera-feed {
        width: 100%;
        display: block;
      }

      .camera-unavailable {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 200px;
        color: var(--secondary-text-color);
        font-size: 1.2em;
      }

      .joystick-container {
        position: absolute;
        bottom: 16px;
        right: 16px;
        z-index: 10;
      }

      .joystick-base {
        width: var(--joystick-size, 120px);
        height: var(--joystick-size, 120px);
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        border: 2px solid rgba(255, 255, 255, 0.3);
        position: relative;
        touch-action: none;
        cursor: pointer;
      }

      .joystick-base::before {
        content: "";
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 30%;
        height: 30%;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
      }

      .joystick-handle {
        position: absolute;
        width: 40%;
        height: 40%;
        border-radius: 50%;
        background: linear-gradient(145deg, #ffffff, #e0e0e0);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        transition: transform 0.1s ease-out;
        pointer-events: none;
      }

      .joystick-handle.active {
        background: linear-gradient(145deg, #3498db, #2980b9);
      }

      .direction-indicators {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
      }

      .direction-indicator {
        position: absolute;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
        font-weight: bold;
      }

      .direction-indicator.up {
        top: 4px;
        left: 50%;
        transform: translateX(-50%);
      }

      .direction-indicator.down {
        bottom: 4px;
        left: 50%;
        transform: translateX(-50%);
      }

      .direction-indicator.left {
        left: 8px;
        top: 50%;
        transform: translateY(-50%);
      }

      .direction-indicator.right {
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
      }

      .stop-button {
        position: absolute;
        bottom: 16px;
        right: calc(var(--joystick-size, 120px) + 32px);
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(231, 76, 60, 0.8);
        border: 2px solid rgba(255, 255, 255, 0.3);
        color: white;
        font-size: 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(4px);
        z-index: 10;
      }

      .stop-button:hover {
        background: rgba(231, 76, 60, 1);
      }

      .stop-button:active {
        transform: scale(0.95);
      }
    `;
    }

    render() {
        if (!this.hass || !this.config) {
            return html``;
        }

        const cameraEntity = this.hass.states[this.config.camera_entity];
        const joystickSize = this.config.joystick_size;

        return html`
      <ha-card>
        <div class="card-container" style="--joystick-size: ${joystickSize}px">
          ${this.config.title
                ? html`<div class="card-header">${this.config.title}</div>`
                : ""}
          <div class="camera-container">
            ${cameraEntity
                ? html`
                  <img
                    class="camera-feed"
                    src="${this._getCameraUrl()}"
                    alt="Camera Feed"
                    @error="${this._handleImageError}"
                  />
                `
                : html`
                  <div class="camera-unavailable">
                    Camera unavailable
                  </div>
                `}

            <button class="stop-button" @click="${this._handleStop}" title="Stop">
              ■
            </button>

            <div class="joystick-container">
              <div
                class="joystick-base"
                @mousedown="${this._handleJoystickStart}"
                @touchstart="${this._handleJoystickStart}"
                @mousemove="${this._handleJoystickMove}"
                @touchmove="${this._handleJoystickMove}"
                @mouseup="${this._handleJoystickEnd}"
                @touchend="${this._handleJoystickEnd}"
                @mouseleave="${this._handleJoystickEnd}"
              >
                <div class="direction-indicators">
                  <span class="direction-indicator up">▲</span>
                  <span class="direction-indicator down">▼</span>
                  <span class="direction-indicator left">◀</span>
                  <span class="direction-indicator right">▶</span>
                </div>
                <div
                  class="joystick-handle ${this._joystickActive ? 'active' : ''}"
                  style="transform: translate(calc(-50% + ${this._joystickX}px), calc(-50% + ${this._joystickY}px))"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </ha-card>
    `;
    }

    _getCameraUrl() {
        const entity = this.config.camera_entity;
        const token = this.hass.states[entity]?.attributes?.access_token;
        if (token) {
            return `/api/camera_proxy_stream/${entity}?token=${token}`;
        }
        return `/api/camera_proxy/${entity}`;
    }

    _handleImageError(e) {
        // Fallback to static image if stream fails
        const entity = this.config.camera_entity;
        e.target.src = `/api/camera_proxy/${entity}`;
    }

    _handleJoystickStart(e) {
        e.preventDefault();
        this._joystickActive = true;
        this._handleJoystickMove(e);
    }

    _handleJoystickMove(e) {
        if (!this._joystickActive) return;
        e.preventDefault();

        const joystickBase = this.shadowRoot.querySelector(".joystick-base");
        const rect = joystickBase.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const maxDistance = rect.width / 2 - 20;
        let deltaX = clientX - centerX;
        let deltaY = clientY - centerY;

        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (distance > maxDistance) {
            deltaX = (deltaX / distance) * maxDistance;
            deltaY = (deltaY / distance) * maxDistance;
        }

        this._joystickX = deltaX;
        this._joystickY = deltaY;

        this._processJoystickPosition(deltaX, deltaY, maxDistance);
    }

    _handleJoystickEnd(e) {
        if (!this._joystickActive) return;
        e.preventDefault();

        this._joystickActive = false;
        this._joystickX = 0;
        this._joystickY = 0;
        this._lastDirection = null;

        if (this._moveInterval) {
            clearInterval(this._moveInterval);
            this._moveInterval = null;
        }

        this._callPTZService("STOP", 0, 0);
    }

    _processJoystickPosition(x, y, maxDistance) {
        const normalizedX = x / maxDistance;
        const normalizedY = -y / maxDistance; // Invert Y for intuitive control

        const threshold = 0.3;
        let direction = null;
        let panSpeed = 0;
        let tiltSpeed = 0;

        if (Math.abs(normalizedX) > threshold || Math.abs(normalizedY) > threshold) {
            if (Math.abs(normalizedX) > Math.abs(normalizedY)) {
                direction = normalizedX > 0 ? "RIGHT" : "LEFT";
                panSpeed = Math.abs(normalizedX) * this.config.move_speed;
            } else {
                direction = normalizedY > 0 ? "UP" : "DOWN";
                tiltSpeed = Math.abs(normalizedY) * this.config.move_speed;
            }

            // Also handle diagonal movement
            if (Math.abs(normalizedX) > threshold && Math.abs(normalizedY) > threshold) {
                panSpeed = Math.abs(normalizedX) * this.config.move_speed;
                tiltSpeed = Math.abs(normalizedY) * this.config.move_speed;
                if (normalizedX > 0 && normalizedY > 0) direction = "UP_RIGHT";
                else if (normalizedX < 0 && normalizedY > 0) direction = "UP_LEFT";
                else if (normalizedX > 0 && normalizedY < 0) direction = "DOWN_RIGHT";
                else direction = "DOWN_LEFT";
            }
        }

        if (direction && direction !== this._lastDirection) {
            this._lastDirection = direction;
            this._callPTZService(direction, panSpeed, tiltSpeed);
        }
    }

    _handleStop() {
        this._callPTZService("STOP", 0, 0);
    }

    async _callPTZService(direction, panSpeed, tiltSpeed) {
        const ptzEntity = this.config.ptz_entity || this.config.camera_entity;
        const service = this.config.service;
        const [domain, serviceName] = service.split(".");

        let serviceData = {
            entity_id: ptzEntity,
            ...this.config.service_data,
        };

        // Handle different PTZ service formats
        if (domain === "onvif") {
            serviceData = {
                ...serviceData,
                move_mode: direction === "STOP" ? "Stop" : "ContinuousMove",
            };

            if (direction !== "STOP") {
                switch (direction) {
                    case "UP":
                        serviceData.tilt = tiltSpeed;
                        break;
                    case "DOWN":
                        serviceData.tilt = -tiltSpeed;
                        break;
                    case "LEFT":
                        serviceData.pan = -panSpeed;
                        break;
                    case "RIGHT":
                        serviceData.pan = panSpeed;
                        break;
                    case "UP_LEFT":
                        serviceData.pan = -panSpeed;
                        serviceData.tilt = tiltSpeed;
                        break;
                    case "UP_RIGHT":
                        serviceData.pan = panSpeed;
                        serviceData.tilt = tiltSpeed;
                        break;
                    case "DOWN_LEFT":
                        serviceData.pan = -panSpeed;
                        serviceData.tilt = -tiltSpeed;
                        break;
                    case "DOWN_RIGHT":
                        serviceData.pan = panSpeed;
                        serviceData.tilt = -tiltSpeed;
                        break;
                }
            }
        } else {
            // Generic PTZ service format
            serviceData.direction = direction;
            serviceData.speed = Math.max(panSpeed, tiltSpeed);
        }

        try {
            await this.hass.callService(domain, serviceName, serviceData);
        } catch (error) {
            console.error("PTZ service call failed:", error);
        }
    }
}

// Visual Editor for the card
class PTZCameraCardEditor extends LitElement {
    static get properties() {
        return {
            hass: { type: Object },
            _config: { type: Object },
        };
    }

    setConfig(config) {
        this._config = config;
    }

    static get styles() {
        return css`
      .form-row {
        margin-bottom: 16px;
      }
      .form-row label {
        display: block;
        margin-bottom: 4px;
        font-weight: 500;
      }
      .form-row input,
      .form-row select {
        width: 100%;
        padding: 8px;
        border: 1px solid var(--divider-color);
        border-radius: 4px;
        background: var(--card-background-color);
        color: var(--primary-text-color);
      }
    `;
    }

    render() {
        if (!this.hass || !this._config) {
            return html``;
        }

        const cameras = Object.keys(this.hass.states).filter((entity) =>
            entity.startsWith("camera.")
        );

        return html`
      <div class="form-row">
        <label>Camera Entity *</label>
        <select
          .value="${this._config.camera_entity || ""}"
          @change="${this._valueChanged}"
          .configValue="${"camera_entity"}"
        >
          <option value="">Select a camera</option>
          ${cameras.map(
            (camera) => html`
              <option value="${camera}" ?selected="${this._config.camera_entity === camera}">
                ${camera}
              </option>
            `
        )}
        </select>
      </div>

      <div class="form-row">
        <label>PTZ Entity (optional, defaults to camera entity)</label>
        <select
          .value="${this._config.ptz_entity || ""}"
          @change="${this._valueChanged}"
          .configValue="${"ptz_entity"}"
        >
          <option value="">Same as camera</option>
          ${cameras.map(
            (camera) => html`
              <option value="${camera}" ?selected="${this._config.ptz_entity === camera}">
                ${camera}
              </option>
            `
        )}
        </select>
      </div>

      <div class="form-row">
        <label>Title (optional)</label>
        <input
          type="text"
          .value="${this._config.title || ""}"
          @input="${this._valueChanged}"
          .configValue="${"title"}"
        />
      </div>

      <div class="form-row">
        <label>PTZ Service</label>
        <input
          type="text"
          .value="${this._config.service || "onvif.ptz"}"
          @input="${this._valueChanged}"
          .configValue="${"service"}"
          placeholder="onvif.ptz"
        />
      </div>

      <div class="form-row">
        <label>Joystick Size (px)</label>
        <input
          type="number"
          .value="${this._config.joystick_size || 120}"
          @input="${this._valueChanged}"
          .configValue="${"joystick_size"}"
          min="60"
          max="200"
        />
      </div>

      <div class="form-row">
        <label>Move Speed (0-1)</label>
        <input
          type="number"
          .value="${this._config.move_speed || 0.5}"
          @input="${this._valueChanged}"
          .configValue="${"move_speed"}"
          min="0.1"
          max="1"
          step="0.1"
        />
      </div>
    `;
    }

    _valueChanged(e) {
        if (!this._config) return;

        const target = e.target;
        const configValue = target.configValue;
        let value = target.value;

        if (configValue === "joystick_size") {
            value = parseInt(value, 10);
        } else if (configValue === "move_speed") {
            value = parseFloat(value);
        }

        if (this._config[configValue] === value) return;

        const newConfig = { ...this._config };
        if (value === "" || value === undefined) {
            delete newConfig[configValue];
        } else {
            newConfig[configValue] = value;
        }

        const event = new CustomEvent("config-changed", {
            detail: { config: newConfig },
            bubbles: true,
            composed: true,
        });
        this.dispatchEvent(event);
    }
}

customElements.define("ptz-camera-card", PTZCameraCard);
customElements.define("ptz-camera-card-editor", PTZCameraCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
    type: "ptz-camera-card",
    name: "PTZ Camera Card",
    description: "A camera card with pan-tilt joystick control",
    preview: true,
});
