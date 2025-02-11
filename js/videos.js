document.addEventListener("DOMContentLoaded", () => {
    const tabMedicos = document.getElementById("entrevistaMedicos");
    const tabPacientes = document.getElementById("entrevistaPacientes");
    const videoPrincipal = document.getElementById("videoPrincipal");
    const videoItemsContainer = document.querySelector(".container-video-items");
  
    const videosMedicos = [
      {
        src: "https://www.youtube.com/embed/qHjgLjGF8c4",
        thumbnail: "./imagenes/VanesaCastellano.jpeg",
        title: "Dra. Vanesa Castellano",
        subtitle: "Médica Especialista en pediatría",
      },
      {
        src: "https://www.youtube.com/embed/y-xSeTAjjm8",
        thumbnail: "./imagenes/DrLamas.jpeg",
        title: "Dr. Fernando Lamas",
        subtitle: "Médico pediatra",
      },
      {
        src: "https://www.youtube.com/embed/LMPG-8xA4xI",
        thumbnail: "./imagenes/DraLamas.jpeg",
        title: "Dra. Valentina Lamas",
        subtitle: "Médica Pediatra",
      },
    ];
  
    const videosPacientes = [
      {
        src: "https://www.youtube.com/embed/iA9dH8XgWJ4",
        thumbnail: "./imagenes/Paloma.jpeg",
        title: "Paloma",
        subtitle: "Maquilladora e Influencer",
      },
      {
        src: "https://www.youtube.com/embed/kxirpXGSHFQ",
        thumbnail: "./imagenes/Maribel.jpeg",
        title: "Maribel",
        subtitle: "Docente y madre de Paloma y Candela",
      },
      {
        src: "https://www.youtube.com/embed/l5lI9yz4Qi8",
        thumbnail: "./imagenes/FernandoHeinen.jpeg",
        title: "Fernando",
        subtitle: "Especialista en cirugía pediátrica - 71 Años",
      },
    ];
  
    function updateVideos(videos) {
      videoPrincipal.src = videos[0].src;
  
      videoItemsContainer.innerHTML = "";
      videos.forEach((video) => {
        const videoItem = document.createElement("div");
        videoItem.classList.add("video-item");
        videoItem.setAttribute("data-video", video.src);
  
        videoItem.innerHTML = `
          <img src="${video.thumbnail}" alt="${video.title}">
          <div class="video-overlay">
            <p class="video-title">${video.title}</p>
            ${video.subtitle ? `<p class="video-subtitle">${video.subtitle}</p>` : ""}
          </div>
        `;
  
        videoItem.addEventListener("click", () => {
          videoPrincipal.src = video.src;
        });
  
        videoItemsContainer.appendChild(videoItem);
      });
    }
  
    tabMedicos.addEventListener("click", () => {
      tabMedicos.classList.add("tabactivo");
      tabPacientes.classList.remove("tabactivo");
      updateVideos(videosMedicos);
    });
  
    tabPacientes.addEventListener("click", () => {
      tabPacientes.classList.add("tabactivo");
      tabMedicos.classList.remove("tabactivo");
      updateVideos(videosPacientes);
    });
  
    updateVideos(videosMedicos);
  });
  