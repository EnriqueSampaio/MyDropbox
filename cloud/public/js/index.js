$(function (params) {
  $("#fileUpload").submit(function (e) {
    e.preventDefault();
    var formData = new FormData(this);

    $.ajax({
      url: '/upload',
      type: 'POST',
      data: formData,
      success: function (data) {
        if (data) {
          alert("Deu bom");
        } else {
          alert("Deu ruim");
        }
      },
      cache: false,
      contentType: false,
      processData: false
    });
  });
});
