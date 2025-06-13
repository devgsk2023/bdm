document.addEventListener("DOMContentLoaded", function () {
    var videoModal = document.getElementById("videoModal");
    var iframe = document.getElementById("youtube-video");
    var videoUrl = "https://www.youtube.com/embed/23eP8YVRXyc?list=PLvDyxtKlIcng7KjH451XcRAVGXiCnEvd6&autoplay=1&rel=0";

    videoModal.addEventListener("show.bs.modal", function () {
        iframe.src = videoUrl;
    });

    videoModal.addEventListener("hide.bs.modal", function () {
        iframe.src = "";
    });
});
