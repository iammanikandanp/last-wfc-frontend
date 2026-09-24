export const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  // Remove all non-digit characters
  let digits = phone.toString().replace(/\D/g, "");
  if (digits.length === 0) return null;
  // If it's a 10 digit Indian number without country code, add 91
  if (digits.length === 10) {
    digits = "91" + digits;
  }
  return digits;
};

export const getMemberWhatsAppMessage = (member) => {
  if (!member.endDate) return null;
  const name = member.name || "Member";
  const endDateStr = new Date(member.endDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  
  const diffDays = Math.ceil((new Date(member.endDate) - new Date()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const expiredDays = Math.abs(diffDays);
    return `Hi ${name} 👋

We noticed that your WFC Enterprises membership expired ${expiredDays} day${expiredDays > 1 ? "s" : ""} ago.

We hope you're doing well!

Your fitness journey doesn't have to stop here 💪

If you're ready to get back to your workouts, we'd be happy to welcome you back.

You can renew your membership and continue working towards your fitness goals.

Every workout counts — let's get back on track! 🔥

Feel free to contact us for renewal details.

WFC Enterprises`;
  } else if (diffDays === 0) {
    return `Hi ${name} 👋

Just a quick reminder from WFC Enterprises — your membership expires today.

You've put in great effort so far 💪

We'd love to see you continue your fitness journey with us.

You can renew your membership today and continue your workouts without interruption.

Stay consistent and keep pushing towards your goals! 🔥

For renewal assistance, please contact us.

WFC Enterprises`;
  } else if (diffDays <= 7) {
    return `Hi ${name} 👋

Your WFC Enterprises membership is nearing its expiry date.

Your membership is scheduled to expire on ${endDateStr}, with only ${diffDays} day${diffDays > 1 ? "s" : ""} remaining.

You've already made great progress with us 💪

Don't let your consistency stop here. Keep training, stay focused, and continue working towards your fitness goals.

Please renew your membership before it expires so you can continue your workouts without interruption.

If you need any help with renewal, feel free to contact us.

Stay consistent. Stay strong! 💪
WFC Enterprises`;
  }
  return null; // Don't show WhatsApp button for active members > 7 days, unless requested. But instructions say "Expiring Members, Expired Members, and Leads".
};

export const getLeadWhatsAppMessage = (lead) => {
  const name = lead.name || "there";
  
  // If lead source is Walk-in or they have visited, send post-visit message
  if (lead.source === "Walk-in") {
    return `Hi ${name} 👋

Thank you for visiting WFC Enterprises! 🙌

It was great having you at our gym.

We hope you liked the environment, facilities, and training experience.

If you're interested in getting started, we'd be happy to help you choose a membership that suits your fitness goals.

Whenever you're ready, feel free to message us.

Looking forward to seeing you again! 💪

WFC Enterprises`;
  } else {
    // Lead hasn't visited yet but showed interest
    return `Hi ${name} 👋

Thank you for your interest in WFC Enterprises!

We'd love to help you get started with your fitness journey.

Whether your goal is muscle building, weight management, strength, or overall fitness, our team is here to support you.

If you'd like to visit the gym or know more about our membership options, just let us know.

Feel free to message us anytime.

Hope to see you at WFC Enterprises soon! 💪`;
  }
};

export const getPaymentPendingWhatsAppMessage = (name, pendingAmount, dueDateStr) => {
  if (pendingAmount <= 0) return null;
  const memberName = name || "Member";
  
  let dueDateText = "";
  if (dueDateStr) {
    const dueDate = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) {
      dueDateText = `\n\nThis payment was due on ${dueDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} and is now overdue by ${diffDays} day${diffDays > 1 ? "s" : ""}.`;
    } else if (diffDays === 0) {
      dueDateText = `\n\nThis payment is due today.`;
    } else {
      dueDateText = `\n\nThis payment is due on ${dueDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}.`;
    }
  }

  return `Hi ${memberName} 👋

This is a friendly reminder from WFC Enterprises.

An amount of ₹${pendingAmount} is currently pending for your membership payment.${dueDateText}

Please complete the pending payment at your convenience so that your membership remains up to date.

If you have already made the payment, please ignore this message.

Thank you for being a part of WFC Enterprises 💪`;
};

export const getCafeteriaPendingWhatsAppMessage = (name, pendingAmount) => {
  if (pendingAmount <= 0) return null;
  const memberName = name || "Member";

  return `Hi ${memberName} 👋

This is a friendly reminder from WFC Enterprises.

Your cafeteria amount of ₹${pendingAmount} is currently pending.

Whenever convenient, please clear the pending amount at the earliest.

If you have already made the payment, please ignore this message.

Thank you for being a part of WFC Enterprises 💪

Keep going and stay consistent! 🔥`;
};

export const handleWhatsAppClick = (phone, text) => {
  const formattedPhone = formatPhoneNumber(phone);
  if (!formattedPhone) {
    alert("Valid phone number is not available.");
    return;
  }
  const encodedText = encodeURIComponent(text);
  const url = `https://wa.me/${formattedPhone}?text=${encodedText}`;
  window.open(url, "_blank");
};
