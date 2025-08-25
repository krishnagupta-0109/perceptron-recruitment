document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('bgCanvas');
    const ctx = canvas.getContext('2d');
    let W, H;
    let gridOffset = 0;
    const gridSpacing = 50;
    const gridColor = '#3f6eff'; // Use your primary color here

    const setCanvasSize = () => {
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W;
        canvas.height = H;
    };

    const drawGrid = () => {
        ctx.clearRect(0, 0, W, H);
        
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 0.3;
        ctx.globalAlpha = 0.5;

        // Draw vertical lines
        for (let x = 0; x <= W; x += gridSpacing) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, H);
            ctx.stroke();
        }

        // Draw horizontal lines
        for (let y = 0; y <= H; y += gridSpacing) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();
        }

        // Add a subtle scanline effect
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        ctx.moveTo(0, gridOffset);
        ctx.lineTo(W, gridOffset);
        ctx.stroke();
    };

    const animate = () => {
        gridOffset = (gridOffset + 0.5) % H;
        drawGrid();
        requestAnimationFrame(animate);
    };

    window.addEventListener('resize', setCanvasSize);
    setCanvasSize();
    animate();
});