from django import forms

from poc.models import Process, File
from poc.choices import ENVIRONMENTS


class ProcessForm(forms.ModelForm):

    class Meta:
        model = Process
        fields = ['name', 'api_user', 'api_token', 'environment']
        widgets = {
            'name': forms.TextInput(attrs={'id': 'job_name', 'name': 'name', 'class': 'form-control',
                                           'placeholder': 'Job Name'
                                           }),
            'api_user': forms.TextInput(attrs={'id': 'api_user', 'name': 'api_user', 'class': 'form-control',
                                               'placeholder': 'Api User'}),
            'api_token': forms.PasswordInput(attrs={'id': 'api_key', 'name': 'api_token', 'class': 'form-control',
                                                    'placeholder': 'Api Key', 'style': 'opacity: 0.5;'}),
            'environment': forms.Select(choices=ENVIRONMENTS, attrs={'id': 'environment_select',
                                                                     'class': 'custom-select'}),
        }


class FileForm(forms.ModelForm):
    path = forms.FileField(widget=forms.FileInput(attrs={'class': 'custom-file-input', 'id': 'file_csv',
                                                         'aria-describedby': 'path', 'name': 'path',
                                                         'onchange': 'checkFile();'})
                           )

    class Meta:
        model = File
        fields = ['path']
