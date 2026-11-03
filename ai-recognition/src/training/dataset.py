from pathlib import Path
from torchvision import datasets
from torch.utils.data import DataLoader
from torchvision import transforms

DATA_DIR = Path(__file__).resolve().parents[2] / "data" / "splits"

train_transforms = transforms.Compose([
    transforms.RandomResizedCrop(224, scale=(0.8, 1.0)),
    transforms.RandomHorizontalFlip(),
    transforms.ToTensor(),
    transforms.Normalize(
        [0.485, 0.456, 0.406],
        [0.229, 0.224, 0.225]
    )
])

eval_transforms = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(
        [0.485, 0.456, 0.406],
        [0.229, 0.224, 0.225]
    )
])

train_dataset = datasets.ImageFolder(
    DATA_DIR / "train",
    transform=train_transforms
)

val_dataset = datasets.ImageFolder(
    DATA_DIR / "val",
    transform=eval_transforms
)

test_dataset = datasets.ImageFolder(
    DATA_DIR / "test",
    transform=eval_transforms
)

assert train_dataset.class_to_idx == val_dataset.class_to_idx
assert train_dataset.class_to_idx == test_dataset.class_to_idx

train_loader = DataLoader(
    train_dataset,
    batch_size=16,
    shuffle=True,
    num_workers=0
)

val_loader = DataLoader(
    val_dataset,
    batch_size=16,
    shuffle=False,
    num_workers=0
)

test_loader = DataLoader(
    test_dataset,
    batch_size=16,
    shuffle=False,
    num_workers=0
)

if __name__ == "__main__":
    print("Espèces :", train_dataset.classes)
    print("Train :", len(train_dataset))
    print("Validation :", len(val_dataset))
    print("Test :", len(test_dataset))

    images, labels = next(iter(train_loader))

    print("Dimensions :", images.shape)
    print("Labels :", labels)