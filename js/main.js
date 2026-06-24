document.addEventListener('DOMContentLoaded', function () {

  // ---- Mobile nav toggle ----
  var toggle = document.querySelector('.menu-toggle');
  var nav = document.querySelector('.nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      nav.classList.toggle('open');
      toggle.textContent = nav.classList.contains('open') ? '✕' : '☰';
    });
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('open');
        toggle.textContent = '☰';
      });
    });
  }

  // ---- Message character counter ----
  var msgArea = document.getElementById('message');
  var msgCount = document.getElementById('msg-count');
  if (msgArea && msgCount) {
    msgArea.addEventListener('input', function () {
      var len = msgArea.value.length;
      var max = parseInt(msgArea.getAttribute('maxlength'));
      msgCount.textContent = len + ' / ' + max;
      msgCount.style.color = len > max * 0.9 ? '#E07B3F' : '#9AA4B2';
    });
  }

  // ---- Contact form → Azure Function (/api/contact) ----
  var form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('button[type="submit"]');
      var note = document.getElementById('form-note');
      var originalLabel = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Sending…';

      var payload = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        topic: document.getElementById('topic').value,
        message: document.getElementById('message').value,
        website: document.getElementById('website') ? document.getElementById('website').value : ''
      };

      fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          return res.json().then(function (data) { return { ok: res.ok, data: data }; });
        })
        .then(function (result) {
          if (result.ok && result.data.ok) {
            btn.textContent = 'Message sent \u2713';
            if (note) {
              note.style.color = 'var(--azure-deep)';
              note.textContent = "Thanks \u2014 we\u2019ve received your message and will reply within 1\u20132 business days.";
              note.style.display = 'block';
            }
            form.reset();
            if (msgCount) msgCount.textContent = '0 / 2000';
          } else {
            throw new Error((result.data && result.data.error) || 'Something went wrong.');
          }
        })
        .catch(function (err) {
          btn.disabled = false;
          btn.textContent = originalLabel;
          if (note) {
            note.style.color = '#C2483D';
            note.textContent = 'Could not send your message. Please email us directly at contactus@rascomtechnology.com';
            note.style.display = 'block';
          }
        });
    });
  }

});
