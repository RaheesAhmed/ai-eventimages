$(document).ready(function () {
  var uploadBtnText = document.getElementById("uploadtoGallery");
  // When the form is submitted
  $("form").on("submit", function (e) {
    e.preventDefault(); // Prevent the default form submission

    imgP = document.getElementById("img-para");
    // Show the loading skeleton
    $("#loadingSkeleton").show();
    $("#uploadtoGallery").hide();
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
        $("#uploadtoGallery").show();
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

  // When the download button is clicked
  $("#downloadButton").on("click", function (e) {
    e.preventDefault(); // Prevent the default form submission

    handleDownload();
  });

  $("#uploadtoGallery").on("click", function (e) {
    e.preventDefault();

    let imageSrc = $("#generatedImage").attr("src");
    if (!imageSrc) {
      alert("No image available to upload.");
      return;
    }

    // Remove the data URL scheme if it's present
    const base64Pattern = /^data:image\/[a-z]+;base64,/;
    if (base64Pattern.test(imageSrc)) {
      imageSrc = imageSrc.split(",")[1];
    }
    $("#loadingSkeletonupload").show();
    uploadBtnText.innerText = "Uploading...";
    // Send the clean base64 data to your backend
    $.ajax({
      type: "POST",
      url: "http://localhost:8000/upload-image", // Adjust to your endpoint
      data: JSON.stringify({ image: imageSrc }),
      contentType: "application/json; charset=utf-8",
      dataType: "json",
      success: function (response) {
        $("#loadingSkeletonupload").hide();
        console.log("Image successfully uploaded to gallery.", response);
        $("#uploadedimage").append(
          `Thank you for uploading the image to the gallery.`
        );
        uploadBtnText.innerText = "Upload Image to Event Gallery";
      },
      error: function (error) {
        console.error("Error uploading image:", error);
        alert("Failed to upload image.");
      },
    });
  });
});
