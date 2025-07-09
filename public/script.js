// Inject footer
fetch('footer.html')
  .then(res => res.text())
  .then(data => {
    document.getElementById('footer-placeholder').innerHTML = data;
    updateDateTime(); // Start clock
    setInterval(updateDateTime, 1000);
  });

// Date/Time updater
function updateDateTime() {
  const now = new Date();
  const dt = now.toLocaleString();
  const dtElem = document.getElementById('datetime');
  if (dtElem) dtElem.textContent = dt;
}

// Loader
window.addEventListener("load", () => {
  document.getElementById("loader").style.display = "none";
});
