/**
 * PTZ Camera Card
 * A Home Assistant Lovelace card with camera display and pan-tilt arrow controls
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
            _activeDirection: { type: String },
        };
    }

    constructor() {
        super();
        this._activeDirection = null;
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
            button_size: 48,
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

      .ptz-controls {
        position: absolute;
        bottom: 16px;
        right: 16px;
        z-index: 10;
        display: grid;
        grid-template-columns: repeat(3, var(--button-size, 48px));
        grid-template-rows: repeat(3, var(--button-size, 48px));
        gap: 4px;
      }

      .ptz-button {
        width: var(--button-size, 48px);
        height: var(--button-size, 48px);
        border-radius: 8px;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        border: 2px solid rgba(255, 255, 255, 0.3);
        color: white;
        font-size: 20px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s ease;
        user-select: none;
        -webkit-user-select: none;
        touch-action: manipulation;
      }

      .ptz-button:hover {
        background: rgba(52, 152, 219, 0.7);
        border-color: rgba(255, 255, 255, 0.5);
      }

      .ptz-button:active,
      .ptz-button.active {
        background: rgba(52, 152, 219, 0.9);
        transform: scale(0.95);
      }

      .ptz-button.up {
        grid-column: 2;
        grid-row: 1;
      }

      .ptz-button.left {
        grid-column: 1;
        grid-row: 2;
      }

      .ptz-button.stop {
        grid-column: 2;
        grid-row: 2;
        background: rgba(231, 76, 60, 0.7);
        font-size: 16px;
      }

      .ptz-button.stop:hover {
        background: rgba(231, 76, 60, 0.9);
      }

      .ptz-button.right {
        grid-column: 3;
        grid-row: 2;
      }

      .ptz-button.down {
        grid-column: 2;
        grid-row: 3;
      }
    `;
    }

    render() {
        if (!this.hass || !this.config) {
            return html``;
        }

        const cameraEntity = this.hass.states[this.config.camera_entity];
        const buttonSize = this.config.button_size;

        return html`
      <ha-card>
        <div class="card-container" style="--button-size: ${buttonSize}px">
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

            <div class="ptz-controls">
              <button
                class="ptz-button up ${this._activeDirection === 'UP' ? 'active' : ''}"
                @mousedown="${() => this._handleButtonPress('UP')}"
                @mouseup="${this._handleButtonRelease}"
                @mouseleave="${this._handleButtonRelease}"
                @touchstart="${(e) => { e.preventDefault(); this._handleButtonPress('UP'); }}"
                @touchend="${this._handleButtonRelease}"
              >▲</button>
              <button
                class="ptz-button left ${this._activeDirection === 'LEFT' ? 'active' : ''}"
                @mousedown="${() => this._handleButtonPress('LEFT')}"
                @mouseup="${this._handleButtonRelease}"
                @mouseleave="${this._handleButtonRelease}"
                @touchstart="${(e) => { e.preventDefault(); this._handleButtonPress('LEFT'); }}"
                @touchend="${this._handleButtonRelease}"
              >◀</button>
              <button
                class="ptz-button stop"
                @click="${this._handleStop}"
              >■</button>
              <button
                class="ptz-button right ${this._activeDirection === 'RIGHT' ? 'active' : ''}"
                @mousedown="${() => this._handleButtonPress('RIGHT')}"
                @mouseup="${this._handleButtonRelease}"
                @mouseleave="${this._handleButtonRelease}"
                @touchstart="${(e) => { e.preventDefault(); this._handleButtonPress('RIGHT'); }}"
                @touchend="${this._handleButtonRelease}"
              >▶</button>
              <button
                class="ptz-button down ${this._activeDirection === 'DOWN' ? 'active' : ''}"
                @mousedown="${() => this._handleButtonPress('DOWN')}"
                @mouseup="${this._handleButtonRelease}"
                @mouseleave="${this._handleButtonRelease}"
                @touchstart="${(e) => { e.preventDefault(); this._handleButtonPress('DOWN'); }}"
                @touchend="${this._handleButtonRelease}"
              >▼</button>
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

    _handleButtonPress(direction) {
        this._activeDirection = direction;
        const speed = this.config.move_speed;
        this._callPTZService(direction, speed, speed);
    }

    _handleButtonRelease() {
        if (this._activeDirection) {
            this._activeDirection = null;
            this._callPTZService("STOP", 0, 0);
        }
    }

    _handleStop() {
        this._activeDirection = null;
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
        <label>Button Size (px)</label>
        <input
          type="number"
          .value="${this._config.button_size || 48}"
          @input="${this._valueChanged}"
          .configValue="${"button_size"}"
          min="32"
          max="80"
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

        if (configValue === "button_size") {
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
    description: "A camera card with pan-tilt arrow controls",
    preview: true,
});
