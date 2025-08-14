function initRain() {
    const canvas = document.getElementById('rain-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const drops = [];
    const maxDrops = 200;
    
    // Создаем капли с разными характеристиками
    for (let i = 0; i < maxDrops; i++) {
        drops.push({
            x: Math.random() * canvas.width,
            y: Math.random() * -canvas.height,
            length: Math.random() * 30 + 15,
            speed: Math.random() * 7 + 3,
            opacity: Math.random() * 0.3 + 0.1,
            width: Math.random() * 1.2 + 0.3,
            sway: Math.random() * 2 - 1
        });
    }
    
    function drawRain() {
        // Затемняем фон для эффекта следов
        ctx.fillStyle = 'rgba(10, 10, 10, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        for (let i = 0; i < drops.length; i++) {
            const drop = drops[i];
            
            // Создаем градиент для капель
            const gradient = ctx.createLinearGradient(
                drop.x, drop.y, 
                drop.x + drop.sway, drop.y + drop.length
            );
            gradient.addColorStop(0, `rgba(180, 200, 255, ${drop.opacity})`);
            gradient.addColorStop(1, `rgba(100, 140, 230, ${drop.opacity * 0.4})`);
            
            ctx.beginPath();
            ctx.moveTo(drop.x, drop.y);
            ctx.lineTo(drop.x + drop.sway, drop.y + drop.length);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = drop.width;
            ctx.stroke();
            
            // Двигаем капли с небольшим отклонением
            drop.y += drop.speed;
            drop.x += drop.sway * 0.2;
            
            // Если капля ушла за экран - создаем новую вверху
            if (drop.y > canvas.height) {
                drop.y = Math.random() * -100;
                drop.x = Math.random() * canvas.width;
                drop.speed = Math.random() * 7 + 3;
                drop.sway = Math.random() * 2 - 1;
            }
        }
        requestAnimationFrame(drawRain);
    }
    
    drawRain();
    
    // Обновляем размеры при изменении окна
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

document.addEventListener('DOMContentLoaded', initRain);