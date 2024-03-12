$(document).ready(function () {
  // When the form is submitted
  $("form").on("submit", function (e) {
    e.preventDefault(); // Prevent the default form submission

    imgP = document.getElementById("img-para");
    // Show the loading skeleton
    $("#loadingSkeleton").show();

    // AJAX request to backend
    $.ajax({
      type: "POST",
      url: "http://localhost:8000/generate-images", // Your API endpoint
      data: {
        mainScene: $("#mainScene").val(),
        location: $("#location").val(),
        mainCharacter: $("#mainCharacter").val(),
        additionalCharacters: $("#additionalCharacters").val(),
        additionalInfo: $("#additionalInfo").val(),
        fullName: $("#fullName").val(),
        email: $("#email").val(),
        affirmation: $("#affirmation").val(),
      }, // Form data
      contentType: "application/x-www-form-urlencoded; charset=UTF-8",
      success: function (response) {
        // Hide the loading skeleton
        $("#loadingSkeleton").hide();

        // Log the response to the console for debugging
        console.log("Response received:", response);

        // Check if the response has imageData and it's not just a single character 'd'
        if (response.imageData && response.imageData.length > 1) {
          imgP.style.display = "block";
          // Show the generated image
          $("#generatedImage").attr("src", response.imageData).show();

          console.log("Generated image URL:", response.imageData);
        } else {
          // Log an error or handle the case where imageData is not as expected
          console.error("Invalid image data received", response.imageData);
        }
      },
    });
  });
});
const handleDownload = () => {
  const generatedImage = document.getElementById("generatedImage");
  if (generatedImage.src) {
    const img = new Image();
    img.onload = function () {
      const newWindow = window.open("", "_blank");
      const newImg = newWindow.document.createElement("img");
      newImg.src = generatedImage.src;
      newWindow.document.body.appendChild(newImg);
    };
    img.onerror = function () {
      alert("Failed to load image.");
    };
    img.src = generatedImage.src;
  } else {
    alert("No image available to open.");
  }
};
