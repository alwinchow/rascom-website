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

  // ---- Pricing → Rasveon CRM API (/api/pricing-plans) ----
  // Public endpoint returns { plans: [...] } across regions (MY / SG / global).
  // We show the region below (default Malaysia / MYR); the CTA sends people to the app.
  var pricingGrid = document.getElementById('pricing-grid');
  if (pricingGrid) {
    var noteEl = document.getElementById('pricing-note');
    // Local dev uses serve.py's /api proxy; production calls the Rasveon API directly.
    // NOTE: confirm the exact host/path, and enable CORS on the API for this site's origin.
    var isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    var PRICING_API_BASE = isLocal ? '' : 'https://api.staging.rasveon.com';
    var PRICING_ENDPOINT = PRICING_API_BASE + '/api/pricing-plans';
    var REGION = 'MY';
    var SIGNUP_URL = 'https://rasveon.com';
    var CURRENCY = { MYR: 'RM', SGD: 'S$', USD: '$' };

    var escapeHtml = function (s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    };

    var seatLine = function (p) {
      var sym = CURRENCY[p.currency] || '';
      var parts = [];
      if (p.maxSeats) parts.push('Up to ' + p.maxSeats + (p.maxSeats === 1 ? ' user' : ' users'));
      if (p.pricePerExtraSeat != null) parts.push('+' + sym + p.pricePerExtraSeat + ' / extra seat');
      return parts.join(' · ');
    };

    var renderPlans = function (plans) {
      var html = plans.map(function (p) {
        var sym = CURRENCY[p.currency] || escapeHtml(p.currency || '');
        var badge = p.isPopular ? '<span class="price-badge">Most popular</span>' : '';
        var seats = seatLine(p);
        var features = (p.features || []).map(function (f) {
          return '<li>' + escapeHtml(f) + '</li>';
        }).join('');
        var btnClass = p.isPopular ? 'btn btn-primary' : 'btn btn-outline';
        return '' +
          '<div class="price-card' + (p.isPopular ? ' is-highlighted' : '') + '">' +
            badge +
            '<span class="price-name">' + escapeHtml(p.planName) + '</span>' +
            '<div class="price-amount">' +
              '<span class="cur">' + sym + '</span>' +
              '<span class="val">' + escapeHtml(p.priceMonthly != null ? p.priceMonthly : '—') + '</span>' +
              '<span class="per">/mo</span>' +
            '</div>' +
            (seats ? '<p class="price-seats">' + escapeHtml(seats) + '</p>' : '') +
            '<p class="price-tagline">' + escapeHtml(p.description || '') + '</p>' +
            '<ul class="price-features">' + features + '</ul>' +
            '<a href="' + SIGNUP_URL + '" target="_blank" rel="noopener" class="' + btnClass + '">Start free trial</a>' +
          '</div>';
      }).join('');
      pricingGrid.innerHTML = html;
    };

    fetch(PRICING_ENDPOINT, { headers: { 'Accept': 'application/json' } })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        var all = data.plans || [];
        var plans = all.filter(function (p) { return p.region === REGION; });
        if (!plans.length) plans = all.filter(function (p) { return p.region === 'global'; });
        plans.sort(function (a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); });
        if (!plans.length) throw new Error('No plans');
        renderPlans(plans);
        if (noteEl) {
          noteEl.textContent = 'Malaysia pricing (' + (CURRENCY[plans[0].currency] || plans[0].currency) +
            '), per workspace, billed monthly. Ask us about Singapore and global plans.';
        }
      })
      .catch(function () {
        pricingGrid.innerHTML =
          '<p class="pricing-status error">Pricing couldn’t load right now. ' +
          'Please <a href="/contact" style="color:var(--azure);">contact us</a> for current plans.</p>';
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
