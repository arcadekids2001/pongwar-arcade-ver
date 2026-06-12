const App = Vue.createApp({
  data() {
    return {
      title: "PongWAR!",
      canvas: null,
      ctx: null,
      width: 640,
      height: 480,
      animationFrameId: null,
      lastFrameTime: null,
      ball: {
        x: 320,
        y: 240,
        radius: 10,
        dx: 5.8,
        dy: 4.4,
      },
      leftPaddle: {
        x: 20,
        y: 200,
        width: 10,
        height: 80,
      },
      rightPaddle: {
        x: 610,
        y: 200,
        width: 10,
        height: 80,
        speed: 4.6,
      },
      bullets: [],
      playerHealth: 5,
      aiHealth: 10,
      gameStart: false,
      gameOver: false,
      gameOverText: "",
    };
  },

  mounted() {
    window.addEventListener("keydown", this.handleKeyDown);
  },

  beforeUnmount() {
    window.removeEventListener("keydown", this.handleKeyDown);
    cancelAnimationFrame(this.animationFrameId);
  },

  methods: {
    startGame() {
      this.gameStart = true;
      this.$nextTick(() => {
        this.canvas = this.$refs.gameCanvas;
        this.ctx = this.canvas.getContext("2d");
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.startLoop();
      });
    },

    handleMouseMove(event) {
      if (!this.canvas) {
        return;
      }

      const canvasRect = this.canvas.getBoundingClientRect();
      const scaleY = this.height / canvasRect.height;
      const relativeY = (event.clientY - canvasRect.top) * scaleY;

      let newY = relativeY - this.leftPaddle.height / 2;
      newY = Math.max(0, Math.min(this.height - this.leftPaddle.height, newY));
      this.leftPaddle.y = newY;
    },

    handleKeyDown(event) {
      if (event.code === "Space" && this.gameStart && !this.gameOver && this.aiHealth > 0) {
        event.preventDefault();
        this.shootBullet();
      }
    },

    shootBullet() {
      this.bullets.push({
        x: this.leftPaddle.x + this.leftPaddle.width,
        y: this.leftPaddle.y + this.leftPaddle.height / 2,
        width: 20,
        height: 5,
        speed: 7,
      });
    },

    startLoop() {
      cancelAnimationFrame(this.animationFrameId);
      this.lastFrameTime = null;
      this.animationFrameId = requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    },

    gameLoop(timestamp) {
      if (this.gameOver) {
        return;
      }

      const frameDuration = 1000 / 60;
      const elapsed = this.lastFrameTime === null ? frameDuration : timestamp - this.lastFrameTime;
      const frameScale = Math.min(elapsed / frameDuration, 2);

      this.lastFrameTime = timestamp;
      this.update(frameScale);
      this.draw();
      this.animationFrameId = requestAnimationFrame((nextTimestamp) => this.gameLoop(nextTimestamp));
    },

    update(frameScale) {
      this.ball.x += this.ball.dx * frameScale;
      this.ball.y += this.ball.dy * frameScale;

      if (this.ball.y - this.ball.radius <= 0 || this.ball.y + this.ball.radius >= this.height) {
        this.ball.dy *= -1;
      }

      if (
        this.ball.x - this.ball.radius < this.leftPaddle.x + this.leftPaddle.width &&
        this.ball.y > this.leftPaddle.y &&
        this.ball.y < this.leftPaddle.y + this.leftPaddle.height
      ) {
        this.ball.dx = Math.abs(this.ball.dx);
      }

      if (
        this.ball.x + this.ball.radius > this.rightPaddle.x &&
        this.ball.y > this.rightPaddle.y &&
        this.ball.y < this.rightPaddle.y + this.rightPaddle.height
      ) {
        this.ball.dx = -Math.abs(this.ball.dx);
      }

      if (this.ball.x < 0) {
        this.playerHealth -= 1;
        this.resetBall();

        if (this.playerHealth <= 0) {
          this.endGame("You lost!");
        }
      }

      if (this.ball.x > this.width) {
        this.resetBall();
      }

      this.bullets = this.bullets
        .map((bullet) => ({ ...bullet, x: bullet.x + bullet.speed * frameScale }))
        .filter((bullet) => bullet.x <= this.width);

      this.bullets.forEach((bullet) => {
        const hitAI =
          bullet.x + bullet.width >= this.rightPaddle.x &&
          bullet.x <= this.rightPaddle.x + this.rightPaddle.width &&
          bullet.y + bullet.height >= this.rightPaddle.y &&
          bullet.y <= this.rightPaddle.y + this.rightPaddle.height;

        if (hitAI) {
          bullet.hit = true;
          this.aiHealth -= 1;
        }
      });

      this.bullets = this.bullets.filter((bullet) => !bullet.hit);

      if (this.aiHealth <= 0) {
        this.endGame("You defeated the AI!");
        return;
      }

      this.updateAI(frameScale);
    },

    updateAI(frameScale) {
      const targetY = this.ball.y - this.rightPaddle.height / 2;
      const aiStep = this.rightPaddle.speed * frameScale;

      if (this.rightPaddle.y < targetY) {
        this.rightPaddle.y += aiStep;
      } else if (this.rightPaddle.y > targetY) {
        this.rightPaddle.y -= aiStep;
      }

      this.rightPaddle.y = Math.max(
        0,
        Math.min(this.height - this.rightPaddle.height, this.rightPaddle.y),
      );
    },

    resetBall() {
      this.ball.x = this.width / 2;
      this.ball.y = this.height / 2;
      this.ball.dx = (Math.random() > 0.5 ? 1 : -1) * 5.8;
      this.ball.dy = (Math.random() > 0.5 ? 1 : -1) * 4.4;
    },

    endGame(message) {
      this.gameOver = true;
      this.gameOverText = message;
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
      this.lastFrameTime = null;
    },

    restartGame() {
      this.playerHealth = 5;
      this.aiHealth = 10;
      this.gameOver = false;
      this.gameOverText = "";
      this.bullets = [];
      this.leftPaddle.y = 200;
      this.rightPaddle.y = 200;
      this.resetBall();
      this.startLoop();
    },

    draw() {
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.ctx.fillStyle = "white";

      this.ctx.beginPath();
      this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.closePath();

      this.ctx.fillRect(
        this.leftPaddle.x,
        this.leftPaddle.y,
        this.leftPaddle.width,
        this.leftPaddle.height,
      );
      this.ctx.fillRect(
        this.rightPaddle.x,
        this.rightPaddle.y,
        this.rightPaddle.width,
        this.rightPaddle.height,
      );

      this.bullets.forEach((bullet) => {
        this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
      });
    },
  },
});

App.mount("#app");
