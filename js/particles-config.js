/* particles-config.js */
particlesJS("particles-js", {
  "particles": {
    "number": { "value": 90, "density": { "enable": true, "value_area": 900 } },
    "color": { "value": ["#00ffff", "#ff00ff", "#7fffd4"] },
    "shape": { "type": "circle" },
    "opacity": { "value": 0.6, "random": true },
    "size": { "value": 3, "random": true },
    "line_linked": {
      "enable": true,
      "distance": 140,
      "color": "#00ffff",
      "opacity": 0.25,
      "width": 1
    },
    "move": {
      "enable": true,
      "speed": 1.8,
      "direction": "none",
      "random": true,
      "straight": false,
      "out_mode": "bounce",
      "attract": { "enable": true, "rotateX": 600, "rotateY": 1200 }
    }
  },
  "interactivity": {
    "detect_on": "canvas",
    "events": {
      "onhover": { "enable": true, "mode": "grab" },
      "onclick": { "enable": true, "mode": "push" },
      "resize": true
    },
    "modes": {
      "grab": { "distance": 180, "line_linked": { "opacity": 0.6 } },
      "push": { "particles_nb": 5 }
    }
  },
  "retina_detect": true
});
