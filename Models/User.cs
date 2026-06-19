namespace SmartClinicManagementSystem.Models
{
    public class User
    {
        public string Uid { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Role { get; set; } = "Patient"; // Admin, Doctor, Receptionist, Patient
        public string ProfileImage { get; set; } = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=300";
        public bool IsActive { get; set; } = true;
        public string Gender { get; set; } = "Male";
        public string Dob { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
