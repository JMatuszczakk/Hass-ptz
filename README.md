# PTZ Camera Card

A custom Home Assistant Lovelace card that displays a camera feed with a pan-tilt joystick control in the bottom right corner.

## Features

- Live camera feed display
- Interactive joystick for pan-tilt control
- Configurable camera entity and PTZ service
- Smooth joystick animation
- Mobile-friendly touch support

## Installation

### HACS (Recommended)

1. Open HACS in your Home Assistant instance
2. Go to "Frontend" section
3. Click the three dots in the top right corner
4. Select "Custom repositories"
5. Add this repository URL and select "Lovelace" as the category
6. Click "Install"
7. Restart Home Assistant

### Manual Installation

1. Download `ptz-camera-card.js` from the latest release
2. Copy it to your `config/www` folder
3. Add the resource in your Lovelace configuration:

```yaml
resources:
  - url: /local/ptz-camera-card.js
    type: module
```

## Configuration

Add the card to your Lovelace dashboard:

```yaml
type: custom:ptz-camera-card
camera_entity: camera.your_camera
ptz_entity: camera.your_ptz_camera
title: My PTZ Camera
service: onvif.ptz
```

### Options

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `camera_entity` | string | Yes | - | The camera entity to display |
| `ptz_entity` | string | No | Same as camera_entity | The entity to control PTZ |
| `title` | string | No | - | Card title |
| `service` | string | No | `onvif.ptz` | The service to call for PTZ control |
| `service_data` | object | No | `{}` | Additional service data |
| `joystick_size` | number | No | `120` | Size of the joystick in pixels |
| `move_speed` | number | No | `0.5` | Movement speed (0-1) |

## PTZ Services

This card is designed to work with various PTZ integrations:

### ONVIF
```yaml
service: onvif.ptz
```

### Generic Camera
```yaml
service: camera.move
```

### Custom Service
```yaml
service: rest_command.ptz_move
service_data:
  camera_id: 1
```

## License

MIT License
