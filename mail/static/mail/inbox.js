document.addEventListener('DOMContentLoaded', function () {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', compose_email);

  // When user send email
  document.querySelector('#compose-form').addEventListener('submit', function (event) {
    event.preventDefault();
    send_email();
    return false;
  });

  // By default, load the inbox
  load_mailbox('inbox');
});

function compose_email() {

  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#email-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';

  // Clear out composition fields
  document.querySelector('#compose-recipients').value = '';
  document.querySelector('#compose-subject').value = '';
  document.querySelector('#compose-body').value = '';
}

function load_mailbox(mailbox) {

  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#email-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';

  // Show the mailbox name
  document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

  // Show header of mail list
  const headerDiv = document.createElement('div')
  headerDiv.className = 'row my-1 px-1';
  ['Sender', 'Subject', 'Timestamp'].forEach(divName => {
    let headerCol = document.createElement('div');
    headerCol.className = 'col mx-1';
    headerCol.innerHTML = `<strong>${divName}</strong>`;
    headerDiv.appendChild(headerCol);
  })
  document.querySelector('#emails-view').append(headerDiv);

  // Send GET request to get mailbox data
  fetch(`/emails/${mailbox}`, { method: 'GET' })
    .then(response => response.json())
    .then(result => {
      result.forEach(item => {
        // Create Div for display Each Mail's sender, subject, timestamp
        const emailList = document.createElement('div');
        emailList.id = 'mail';
        emailList.className = 'border row my-1 px-1';
        ['sender', 'subject', 'timestamp'].forEach(div => {
          let childDiv = document.createElement('div');
          childDiv.id = div;
          childDiv.className = 'col mx-1';
          childDiv.innerHTML = `<p>${item[div]}</p>`;
          if (div === 'subject') {
            childDiv.addEventListener('click', () => load_email(item['id'], mailbox))
            childDiv.className += ' font-weight-bold'
          }
          emailList.appendChild(childDiv);
        });
        if (item['read']) { emailList.style = 'background: lightgray'; }
        document.querySelector('#emails-view').append(emailList);
      })
    });
}

function send_email() {
  const recipients = document.querySelector('#compose-recipients').value;
  const subject = document.querySelector('#compose-subject').value;
  const body = document.querySelector('#compose-body').value;

  // send POST request to the /emails route
  fetch('/emails', {
    method: 'POST',
    body: JSON.stringify({
      recipients: recipients,
      subject: subject,
      body: body
    })
  })
    .then(response => response.json())
    .then(result => {
      console.log(result);
      load_mailbox('sent');
    });
}

function load_email(id, mailbox) {

  // Show the mailbox and hide other views
  document.querySelector('#email-view').style.display = 'block';
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';

  // Reset the email view 
  document.querySelector('#email-view').innerHTML = "";

  // call API and render email
  fetch(`/emails/${id}`)
    .then(response => response.json())
    .then(result => {
      const mailBody = document.querySelector('#email-view').appendChild(document.createElement('div'));
      mailBody.id = 'mailBody';
      mailBody.className = "my-1 px-1";
      ['sender', 'recipients', 'subject', 'timestamp', 'body'].forEach(id => {
        childDiv = document.createElement('div');
        childDiv.id = id;
        childDiv.className = "my-1 py-1";
        const header = document.createElement('h6');
        const content = document.createElement('p');
        header.innerHTML = `${id.charAt(0).toUpperCase() + id.slice(1)}`
        content.innerHTML = `${result[id]}`
        childDiv.appendChild(header);
        childDiv.appendChild(content);
        mailBody.appendChild(childDiv);
      });

      // add archive(for inbox mailbox), unarchive(for archive mailbox) button 
      if (mailbox === 'inbox') {
        const archiveBtn = document.createElement('button');
        archiveBtn.innerText = 'Archive';
        archiveBtn.className += "mx-1";
        // make sure user can't archive already archive mail (user won't even see disabled button without bug)
        if (result['archived'] === true) { archiveBtn.disabled = true; }

        archiveBtn.addEventListener('click', () => {
          // send PUT request to archive the mail
          fetch(`/emails/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
              archived: true
            })
          })
            .then(result => {
              console.log(result);
              load_mailbox('inbox');
            });
        }
        )
        mailBody.append(archiveBtn);
      } else if (mailbox === 'archive') {
        const archiveBtn = document.createElement('button');
        archiveBtn.innerText = 'Unarchive';
        archiveBtn.className += "mx-1";
        archiveBtn.addEventListener('click', () => {
          // send PUT request to archive the mail
          fetch(`/emails/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
              archived: false
            })
          })
            .then(result => {
              console.log(result);
              load_mailbox('inbox');
            });
        }
        )
        mailBody.append(archiveBtn);
      }

      // add reply button (for inbox, archive)
      if (mailbox === 'inbox' || mailbox === 'archive') {
        const replyBtn = document.createElement('button');
        replyBtn.id = 'reply';
        replyBtn.innerText = 'Reply';
        replyBtn.className += "mx-1";
        replyBtn.addEventListener('click', () => {
          reply_email(result)
        })
        mailBody.append(replyBtn);
      }

      // Mark the email as read (Send PUT request)
      if (result['read'] === false) {
        fetch(`/emails/${id}`, {
          method: 'PUT',
          body: JSON.stringify({
            read: true
          })
        })
        .then(result => {
          console.log(result);
        })
      }
    }
    );
}

function reply_email(email) {
  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#email-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';

  // Clear out composition fields
  document.querySelector('#compose-recipients').value = `${email.sender}`;
  document.querySelector('#compose-subject').value = (email.subject.substring(0, 3) !== 'Re:') ? `Re: ${email.subject}` : email.subject;
  document.querySelector('#compose-body').value = `On ${email.timestamp} ${email.sender} wrote: \n ${email.body}\n---------------------------------------------\n`;
  
}